import { DifficultyDots } from "@/components/team-crest"
import type { HeadToHeadResult, TeamFormEntry } from "@/lib/fixtures/form"
import { describeFixtureDifficulty } from "@/lib/fixtures/upcoming"
import type { FplFixture, FplTeam } from "@/lib/fpl/types"
import { cn } from "@/lib/utils"

function FormPills({ entries }: { entries: TeamFormEntry[] }) {
  if (entries.length === 0) {
    return <span className="text-xs text-muted-foreground">No form yet</span>
  }

  return (
    <div className="flex items-center gap-1">
      {[...entries].reverse().map((entry) => (
        <span
          key={entry.fixtureId}
          className={cn(
            "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
            entry.result === "W" && "bg-pl-green/20 text-pl-green",
            entry.result === "D" && "bg-foreground/10 text-muted-foreground",
            entry.result === "L" && "bg-pl-pink/20 text-pl-pink"
          )}
          title={`${entry.wasHome ? "H" : "A"} ${entry.goalsFor}-${entry.goalsAgainst} vs ${entry.opponentShort}`}
        >
          {entry.result}
        </span>
      ))}
    </div>
  )
}

function difficultyLabelClass(difficulty: number): string {
  const label = describeFixtureDifficulty(difficulty)
  switch (label) {
    case "easier":
      return "text-rating-good"
    case "harder":
      return "text-rating-bad"
    case "average":
      return "text-muted-foreground"
    default: {
      const _exhaustive: never = label
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
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="rounded-xl bg-foreground/3 p-3">
        <p className="mb-3 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          Fixture difficulty
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-medium">
              {homeTeam?.short_name ?? "Home"}
            </span>
            <DifficultyDots difficulty={fixture.team_h_difficulty} />
            <span
              className={cn(
                "text-[10px] font-semibold capitalize",
                difficultyLabelClass(fixture.team_h_difficulty)
              )}
            >
              {describeFixtureDifficulty(fixture.team_h_difficulty)}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-medium">
              {awayTeam?.short_name ?? "Away"}
            </span>
            <DifficultyDots difficulty={fixture.team_a_difficulty} />
            <span
              className={cn(
                "text-[10px] font-semibold capitalize",
                difficultyLabelClass(fixture.team_a_difficulty)
              )}
            >
              {describeFixtureDifficulty(fixture.team_a_difficulty)}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-foreground/3 p-3">
        <p className="mb-3 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          Form (last 5)
        </p>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">
              {homeTeam?.short_name ?? "Home"}
            </span>
            <FormPills entries={homeForm} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">
              {awayTeam?.short_name ?? "Away"}
            </span>
            <FormPills entries={awayForm} />
          </div>
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
