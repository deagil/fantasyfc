import { MATCH_SIDES_GRID } from "@/components/match-layout"
import {
  padTeamFormSlots,
  type HeadToHeadResult,
  type TeamFormEntry,
} from "@/lib/fixtures/form"
import {
  describeMatchAssetOutlook,
  type MatchAssetOutlookId,
} from "@/lib/fixtures/upcoming"
import type { FplFixture, FplTeam } from "@/lib/fpl/types"
import { cn } from "@/lib/utils"

const FORM_SLOT_COUNT = 5

function FormBoxes({
  entries,
  align,
}: {
  entries: TeamFormEntry[]
  align: "start" | "end"
}) {
  const slots = padTeamFormSlots(entries, FORM_SLOT_COUNT)

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-0.5",
        align === "end" ? "justify-end" : "justify-start"
      )}
    >
      {slots.map((entry, index) => {
        if (entry == null) {
          return (
            <span
              key={`empty-${index}`}
              className="flex h-6 w-5 shrink-0 items-center justify-center rounded-sm bg-foreground/5 text-[10px] font-semibold text-muted-foreground/50"
              aria-label="No result yet"
            >
              –
            </span>
          )
        }

        return (
          <span
            key={entry.fixtureId}
            className={cn(
              "flex h-6 w-5 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold",
              entry.result === "W" && "bg-pl-green/20 text-pl-green",
              entry.result === "D" && "bg-foreground/10 text-muted-foreground",
              entry.result === "L" && "bg-pl-pink/20 text-pl-pink"
            )}
            title={`${entry.wasHome ? "H" : "A"} ${entry.goalsFor}-${entry.goalsAgainst} vs ${entry.opponentShort}`}
          >
            {entry.result}
          </span>
        )
      })}
    </div>
  )
}

function previewToneClass(id: MatchAssetOutlookId): string {
  switch (id) {
    case "home_favoured":
    case "away_favoured":
    case "both_open":
      return "text-rating-good"
    case "both_tough":
      return "text-rating-bad"
    case "competitive":
      return "text-foreground"
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}

export function MatchPrematch({
  fixture,
  homeTeam,
  awayTeam,
  homeForm,
  awayForm,
  headToHead,
  className,
}: {
  fixture: FplFixture
  homeTeam: FplTeam | undefined
  awayTeam: FplTeam | undefined
  homeForm: TeamFormEntry[]
  awayForm: TeamFormEntry[]
  headToHead: HeadToHeadResult[]
  className?: string
}) {
  const homeName = homeTeam?.name ?? homeTeam?.short_name ?? "Home"
  const awayName = awayTeam?.name ?? awayTeam?.short_name ?? "Away"
  const preview = describeMatchAssetOutlook(
    fixture.team_h_difficulty,
    fixture.team_a_difficulty,
    { homeName, awayName }
  )

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="rounded-xl bg-foreground/3 px-3 py-4">
        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          Match preview
        </p>
        <p
          className={cn(
            "mt-4 mb-1 text-center text-lg font-semibold tracking-tight text-balance",
            previewToneClass(preview.id)
          )}
        >
          {preview.label}
        </p>
      </div>

      <div className="rounded-xl bg-foreground/3 p-3">
        <p className="mb-3 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          Form (last 5)
        </p>
        <div className={MATCH_SIDES_GRID}>
          <FormBoxes entries={homeForm} align="end" />
          <div aria-hidden className="min-h-6" />
          <FormBoxes entries={awayForm} align="start" />
        </div>
      </div>

      {headToHead.length > 0 ? (
        <div className="rounded-xl bg-foreground/3 p-3">
          <p className="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Season head-to-head
          </p>
          <ul className="flex flex-col gap-1.5">
            {headToHead.map((result) => (
              <li
                key={result.fixtureId}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-xs text-muted-foreground">
                  GW{result.event}
                </span>
                <span className="font-semibold tabular-nums">
                  {result.homeScore}–{result.awayScore}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
