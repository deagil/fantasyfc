import { TeamCrest } from "@/components/team-crest"
import { formatTeamRecord, getFixturePhase } from "@/lib/fixtures/form"
import type { TeamRecord } from "@/lib/fixtures/form"
import type { FplFixture, FplTeam } from "@/lib/fpl/types"
import { cn } from "@/lib/utils"

export function MatchHero({
  fixture,
  homeTeam,
  awayTeam,
  homeBadgeUrl,
  awayBadgeUrl,
  homeRecord,
  awayRecord,
  className,
}: {
  fixture: FplFixture
  homeTeam: FplTeam | undefined
  awayTeam: FplTeam | undefined
  homeBadgeUrl?: string | null
  awayBadgeUrl?: string | null
  homeRecord?: TeamRecord | null
  awayRecord?: TeamRecord | null
  className?: string
}) {
  const phase = getFixturePhase(fixture)
  const homeShort = homeTeam?.short_name ?? "???"
  const awayShort = awayTeam?.short_name ?? "???"
  const homeName = homeTeam?.name ?? homeShort
  const awayName = awayTeam?.name ?? awayShort

  const kickoffLabel = fixture.kickoff_time
    ? new Date(fixture.kickoff_time).toLocaleString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Kickoff TBC"

  return (
    <div className={cn("flex flex-col gap-3 px-4 pt-1 pb-3", className)}>
      <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
        <span>GW{fixture.event}</span>
        <span aria-hidden="true">·</span>
        {phase === "live" ? (
          <span className="inline-flex items-center gap-1.5 text-pl-pink">
            <span className="size-1.5 animate-pulse rounded-full bg-pl-pink" />
            LIVE {fixture.minutes > 0 ? `${fixture.minutes}'` : ""}
          </span>
        ) : phase === "finished" ? (
          <span>Full time</span>
        ) : (
          <span>{kickoffLabel}</span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 flex-col items-center gap-2 text-center">
          <TeamCrest
            badgeUrl={homeBadgeUrl}
            shortName={homeShort}
            className="size-10"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{homeName}</p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {homeRecord ? formatTeamRecord(homeRecord) : "0-0-0"}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center px-2">
          {phase === "pre-match" ? (
            <span className="text-2xl font-bold tracking-tight text-muted-foreground">
              vs
            </span>
          ) : (
            <span className="text-3xl font-bold tabular-nums tracking-tight">
              {fixture.team_h_score ?? 0}
              <span className="mx-1 text-muted-foreground">–</span>
              {fixture.team_a_score ?? 0}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col items-center gap-2 text-center">
          <TeamCrest
            badgeUrl={awayBadgeUrl}
            shortName={awayShort}
            className="size-10"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{awayName}</p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {awayRecord ? formatTeamRecord(awayRecord) : "0-0-0"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
