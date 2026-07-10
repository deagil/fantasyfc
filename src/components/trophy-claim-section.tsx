import { useEffect, useRef, useState } from "react"
import { useServerFn } from "@tanstack/react-start"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SettingsRow } from "@/components/settings-row"
import { useTeam } from "@/lib/fpl/team-context"
import {
  claimEntry,
  getMyTrophies,
  previewEntryClaim,
  submitClaimHelp,
} from "@/lib/trophies/server"
import type {
  ClaimPreview,
  EntryClaim,
  LeagueTrophy,
} from "@/lib/trophies/types"

type ClaimStep =
  | { type: "idle" }
  | { type: "preview"; preview: ClaimPreview }
  | { type: "already_claimed"; season: string; fplEntryId: number }
  | { type: "help_sent" }

function medalLabel(medal: LeagueTrophy["medal"]) {
  switch (medal) {
    case "gold":
      return "1st"
    case "silver":
      return "2nd"
    case "bronze":
      return "3rd"
    default: {
      const _exhaustive: never = medal
      return _exhaustive
    }
  }
}

export function TrophyClaimSection() {
  const { teamId } = useTeam()
  const previewClaim = useServerFn(previewEntryClaim)
  const claim = useServerFn(claimEntry)
  const submitHelp = useServerFn(submitClaimHelp)
  const fetchTrophies = useServerFn(getMyTrophies)

  const [teamIdInput, setTeamIdInput] = useState("")
  const [step, setStep] = useState<ClaimStep>({ type: "idle" })
  const [entryClaim, setEntryClaim] = useState<EntryClaim | null>(null)
  const [trophies, setTrophies] = useState<LeagueTrophy[]>([])
  const [helpMessage, setHelpMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadGenerationRef = useRef(0)

  const refreshCabinet = async () => {
    const result = await fetchTrophies()
    setEntryClaim(result.claim)
    setTrophies(result.trophies)
  }

  useEffect(() => {
    const generation = ++loadGenerationRef.current
    setIsLoading(true)
    setError(null)

    void fetchTrophies()
      .then((result) => {
        if (generation !== loadGenerationRef.current) {
          return
        }
        setEntryClaim(result.claim)
        setTrophies(result.trophies)
      })
      .catch(() => {
        if (generation !== loadGenerationRef.current) {
          return
        }
        setError("Could not load trophies.")
      })
      .finally(() => {
        if (generation !== loadGenerationRef.current) {
          return
        }
        setIsLoading(false)
      })
  }, [fetchTrophies])

  useEffect(() => {
    if (teamId && !teamIdInput) {
      setTeamIdInput(String(teamId))
    }
  }, [teamId, teamIdInput])

  const handlePreview = async () => {
    const parsedTeamId = Number.parseInt(teamIdInput, 10)
    if (!Number.isFinite(parsedTeamId) || parsedTeamId <= 0) {
      setError("Enter a valid team ID.")
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const preview = await previewClaim({ data: { teamId: parsedTeamId } })
      setStep({ type: "preview", preview })
    } catch {
      setError("Could not load that team. Check the ID and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmClaim = async () => {
    if (step.type !== "preview") {
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const result = await claim({
        data: { teamId: step.preview.fplEntryId },
      })

      switch (result.status) {
        case "claimed":
        case "already_linked":
          setEntryClaim(result.claim)
          setStep({ type: "idle" })
          await refreshCabinet()
          break
        case "already_claimed":
          setStep({
            type: "already_claimed",
            season: result.season,
            fplEntryId: result.fplEntryId,
          })
          break
        default: {
          const _exhaustive: never = result
          return _exhaustive
        }
      }
    } catch {
      setError("Could not claim that team. Try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitHelp = async () => {
    if (step.type !== "already_claimed") {
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await submitHelp({
        data: {
          season: step.season,
          fplEntryId: step.fplEntryId,
          message: helpMessage,
        },
      })
      setHelpMessage("")
      setStep({ type: "help_sent" })
    } catch {
      setError("Could not send help request. Try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
        <span className="text-muted-foreground">Trophies</span>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm">
      <span className="text-muted-foreground">Trophies</span>

      {entryClaim ? (
        <SettingsRow
          label="Linked team"
          value={`${entryClaim.entry_name} · ${entryClaim.player_name} (${entryClaim.season})`}
        />
      ) : step.type === "idle" ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground">
            Link your FPL team for this season to bank podium finishes in your
            cabinet.
          </p>
          <Label htmlFor="claim-team-id">Team ID</Label>
          <Input
            id="claim-team-id"
            inputMode="numeric"
            placeholder="e.g. 216925"
            value={teamIdInput}
            onChange={(event) => setTeamIdInput(event.target.value)}
          />
          <Button
            size="sm"
            className="w-full lg:w-auto lg:self-start"
            disabled={!teamIdInput || isSubmitting}
            onClick={() => void handlePreview()}
          >
            {isSubmitting ? "Checking..." : "Continue"}
          </Button>
        </div>
      ) : null}

      {step.type === "preview" ? (
        <div className="flex flex-col gap-2">
          <p>
            Link{" "}
            <span className="font-medium">{step.preview.entryName}</span>{" "}
            managed by{" "}
            <span className="font-medium">{step.preview.playerName}</span> for{" "}
            <span className="font-medium">{step.preview.season}</span>?
          </p>
          <div className="flex flex-col gap-2 lg:flex-row">
            <Button
              size="sm"
              disabled={isSubmitting}
              onClick={() => void handleConfirmClaim()}
            >
              {isSubmitting ? "Linking..." : "Confirm link"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setStep({ type: "idle" })}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {step.type === "already_claimed" ? (
        <div className="flex flex-col gap-2">
          <p>
            Team #{step.fplEntryId} is already linked for {step.season}. If
            that&apos;s your team, get help and we&apos;ll sort it out.
          </p>
          <Label htmlFor="claim-help-message">Message</Label>
          <Input
            id="claim-help-message"
            placeholder="This is my team — here's how I can prove it"
            value={helpMessage}
            onChange={(event) => setHelpMessage(event.target.value)}
          />
          <div className="flex flex-col gap-2 lg:flex-row">
            <Button
              size="sm"
              disabled={helpMessage.trim().length < 5 || isSubmitting}
              onClick={() => void handleSubmitHelp()}
            >
              {isSubmitting ? "Sending..." : "Get help"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setStep({ type: "idle" })}
            >
              Back
            </Button>
          </div>
        </div>
      ) : null}

      {step.type === "help_sent" ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground">
            Help request sent. We&apos;ll review it and get back to you.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-full lg:w-auto lg:self-start"
            onClick={() => setStep({ type: "idle" })}
          >
            Done
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-destructive">{error}</p> : null}

      {entryClaim ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <span className="text-muted-foreground">My trophies</span>
          {trophies.length === 0 ? (
            <p className="text-muted-foreground">
              No podium finishes banked for {entryClaim.season} yet. They appear
              after the season ends when someone from each league connects a
              team.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {trophies.map((trophy) => (
                <li
                  key={trophy.id}
                  className="flex flex-col gap-0.5 rounded-lg bg-background/60 px-2.5 py-2"
                >
                  <div className="font-medium">
                    {medalLabel(trophy.medal)} · {trophy.league_name}
                  </div>
                  <div className="text-muted-foreground">
                    {trophy.points} pts
                    {trophy.margin > 0 ? ` · +${trophy.margin} margin` : null}
                    {trophy.league_size > 0
                      ? ` · ${trophy.league_size} managers`
                      : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
