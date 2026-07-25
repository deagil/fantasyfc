import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useServerFn } from "@tanstack/react-start"
import { CircleHelpIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth/auth-context"
import { useTeam } from "@/lib/fpl/team-context"
import {
  claimEntry,
  getMyTrophies,
  previewEntryClaim,
  submitClaimHelp,
} from "@/lib/trophies/server"
import type { ClaimPreview, EntryClaim } from "@/lib/trophies/types"

const CLAIM_BENEFITS =
  "Link this FPL team to your Deadline account for the season. Claiming lets you bank league podium finishes in your silverware cabinet — one team ID per season."

type ClaimStep =
  | { type: "idle" }
  | { type: "preview"; preview: ClaimPreview }
  | { type: "already_claimed"; season: string; fplEntryId: number }
  | { type: "help_sent" }

type TrophyClaimContextValue = {
  entryClaim: EntryClaim | null
  step: ClaimStep
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
  canClaim: boolean
  needsAccount: boolean
  handlePreview: () => Promise<void>
  handleConfirmClaim: () => Promise<void>
  handleSubmitHelp: () => Promise<void>
  helpMessage: string
  setHelpMessage: (value: string) => void
  resetStep: () => void
}

const TrophyClaimContext = createContext<TrophyClaimContextValue | null>(null)

function useTrophyClaim() {
  const context = useContext(TrophyClaimContext)
  if (!context) {
    throw new Error("useTrophyClaim must be used within TrophyClaimProvider")
  }
  return context
}

export function TrophyClaimProvider({ children }: { children: ReactNode }) {
  const { teamId } = useTeam()
  const { isLoggedIn: isAccountLoggedIn, isInitializing: isAuthInitializing } =
    useAuth()
  const previewClaim = useServerFn(previewEntryClaim)
  const claim = useServerFn(claimEntry)
  const submitHelp = useServerFn(submitClaimHelp)
  const fetchTrophies = useServerFn(getMyTrophies)

  const [step, setStep] = useState<ClaimStep>({ type: "idle" })
  const [entryClaim, setEntryClaim] = useState<EntryClaim | null>(null)
  const [helpMessage, setHelpMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadGenerationRef = useRef(0)

  useEffect(() => {
    const generation = ++loadGenerationRef.current

    if (isAuthInitializing) {
      setIsLoading(true)
      return
    }

    if (!isAccountLoggedIn) {
      setEntryClaim(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    void fetchTrophies()
      .then((result) => {
        if (generation !== loadGenerationRef.current) {
          return
        }
        setEntryClaim(result.claim)
      })
      .catch(() => {
        if (generation !== loadGenerationRef.current) {
          return
        }
        // Claim status is optional for the button; don't surface a blocking error here.
      })
      .finally(() => {
        if (generation !== loadGenerationRef.current) {
          return
        }
        setIsLoading(false)
      })
  }, [fetchTrophies, isAccountLoggedIn, isAuthInitializing])

  const handlePreview = useCallback(async () => {
    if (!isAccountLoggedIn) {
      setError("Log in to your Deadline account to claim a team ID.")
      return
    }

    if (teamId === null) {
      setError("Connect an FPL team first.")
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const preview = await previewClaim({ data: { teamId } })
      setStep({ type: "preview", preview })
    } catch {
      setError("Could not load that team. Check the ID and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }, [isAccountLoggedIn, previewClaim, teamId])

  const handleConfirmClaim = useCallback(async () => {
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
  }, [claim, step])

  const handleSubmitHelp = useCallback(async () => {
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
  }, [helpMessage, step, submitHelp])

  const resetStep = useCallback(() => {
    setStep({ type: "idle" })
    setError(null)
  }, [])

  const needsAccount = !isAuthInitializing && !isAccountLoggedIn
  const canClaim =
    !isLoading &&
    !isAuthInitializing &&
    isAccountLoggedIn &&
    entryClaim === null &&
    step.type === "idle" &&
    teamId !== null

  const value = useMemo(
    () => ({
      entryClaim,
      step,
      isLoading: isLoading || isAuthInitializing,
      isSubmitting,
      error,
      canClaim,
      needsAccount,
      handlePreview,
      handleConfirmClaim,
      handleSubmitHelp,
      helpMessage,
      setHelpMessage,
      resetStep,
    }),
    [
      canClaim,
      entryClaim,
      error,
      handleConfirmClaim,
      handlePreview,
      handleSubmitHelp,
      helpMessage,
      isAuthInitializing,
      isLoading,
      isSubmitting,
      needsAccount,
      resetStep,
      step,
    ]
  )

  return (
    <TrophyClaimContext.Provider value={value}>
      {children}
      <TrophyClaimDialog />
    </TrophyClaimContext.Provider>
  )
}

function ClaimInfoButton() {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label="Why claim a team ID?"
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
      >
        <CircleHelpIcon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 text-pretty">
        {CLAIM_BENEFITS}
      </TooltipContent>
    </Tooltip>
  )
}

/** Claim action for the Team settings row — uses the already-connected team ID. */
export function TrophyClaimButton() {
  const {
    canClaim,
    needsAccount,
    isSubmitting,
    handlePreview,
    step,
    entryClaim,
    isLoading,
    error,
  } = useTrophyClaim()
  const { teamId } = useTeam()

  if (isLoading || entryClaim) {
    return entryClaim ? (
      <p className="text-xs text-muted-foreground">
        Team ID claimed for {entryClaim.season}
      </p>
    ) : null
  }

  if (step.type !== "idle") {
    return null
  }

  const label = isSubmitting
    ? "Checking..."
    : needsAccount
      ? "Log in to claim"
      : teamId
        ? "Claim team ID"
        : "Connect a team to claim"

  return (
    <div className="flex flex-col gap-1.5">
      {/*
        Full-width button (matches Switch Team). Label stays optically
        centered; info control sits beside the label without nesting buttons.
      */}
      <div className="relative w-full lg:w-auto lg:self-end">
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={!canClaim || isSubmitting}
          onClick={() => void handlePreview()}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            {label}
            <span className="size-5 shrink-0" aria-hidden="true" />
          </span>
        </Button>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5">
            <span className="invisible select-none" aria-hidden="true">
              {label}
            </span>
            <span className="pointer-events-auto">
              <ClaimInfoButton />
            </span>
          </span>
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function TrophyClaimDialog() {
  const {
    step,
    isSubmitting,
    error,
    handleConfirmClaim,
    handleSubmitHelp,
    helpMessage,
    setHelpMessage,
    resetStep,
  } = useTrophyClaim()

  const open = step.type !== "idle"

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetStep()
        }
      }}
    >
      <DialogContent>
        {step.type === "preview" ? (
          <>
            <DialogHeader>
              <DialogTitle>Claim team ID</DialogTitle>
              <DialogDescription>
                Link this FPL team to your account for this season so podium
                finishes can be banked in your cabinet.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 text-sm">
              <p>
                Claim{" "}
                <span className="font-medium">{step.preview.entryName}</span>{" "}
                (#{step.preview.fplEntryId}) managed by{" "}
                <span className="font-medium">{step.preview.playerName}</span>{" "}
                for{" "}
                <span className="font-medium">{step.preview.season}</span>?
              </p>
              {error ? <p className="text-destructive">{error}</p> : null}
              <div className="flex flex-col gap-2 lg:flex-row lg:justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={resetStep}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => void handleConfirmClaim()}
                >
                  {isSubmitting ? "Claiming..." : "Confirm claim"}
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {step.type === "already_claimed" ? (
          <>
            <DialogHeader>
              <DialogTitle>Team ID already claimed</DialogTitle>
              <DialogDescription>
                Team #{step.fplEntryId} is already linked for {step.season}. If
                that&apos;s your team, get help and we&apos;ll sort it out.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 text-sm">
              <Label htmlFor="claim-help-message">Message</Label>
              <Input
                id="claim-help-message"
                placeholder="This is my team — here's how I can prove it"
                value={helpMessage}
                onChange={(event) => setHelpMessage(event.target.value)}
              />
              {error ? <p className="text-destructive">{error}</p> : null}
              <div className="flex flex-col gap-2 lg:flex-row lg:justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={resetStep}
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  disabled={helpMessage.trim().length < 5 || isSubmitting}
                  onClick={() => void handleSubmitHelp()}
                >
                  {isSubmitting ? "Sending..." : "Get help"}
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {step.type === "help_sent" ? (
          <>
            <DialogHeader>
              <DialogTitle>Help request sent</DialogTitle>
              <DialogDescription>
                We&apos;ll review it and get back to you.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button size="sm" onClick={resetStep}>
                Done
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
