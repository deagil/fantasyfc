import { MatchCard, MatchSidesColumns } from "@/components/match-card"
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

function FormBoxes({ entries }: { entries: TeamFormEntry[] }) {
  const slots = padTeamFormSlots(entries, FORM_SLOT_COUNT)

  return (
    <div className="flex min-w-0 items-center justify-center gap-0.5">
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
      <MatchCard title="Match preview" className="px-3 py-4">
        <p
          className={cn(
            "mt-1 mb-1 text-center text-lg font-semibold tracking-tight text-balance",
            previewToneClass(preview.id)
          )}
        >
          {preview.label}
        </p>
      </MatchCard>

      <MatchCard title="Form (last 5)">
        <MatchSidesColumns
          home={<FormBoxes entries={homeForm} />}
          away={<FormBoxes entries={awayForm} />}
        />
      </MatchCard>

      {headToHead.length > 0 ? (
        <MatchCard title="Season head-to-head">
          <ul className="flex flex-col gap-1.5 px-3">
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
        </MatchCard>
      ) : null}
    </div>
  )
}
