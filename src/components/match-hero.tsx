import { MATCH_SIDES_GRID } from "@/components/match-layout"
import { TeamCrest } from "@/components/team-crest"
import { formatTeamRecord, getFixturePhase } from "@/lib/fixtures/form"
import type { TeamRecord } from "@/lib/fixtures/form"
import { formatMatchKickoffTitle } from "@/lib/fixtures/kickoff"
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
  /** When false, kickoff / live / FT is expected in surrounding chrome instead. */
  showStatus = true,
  className,
}: {
  fixture: FplFixture
  homeTeam: FplTeam | undefined
  awayTeam: FplTeam | undefined
  homeBadgeUrl?: string | null
  awayBadgeUrl?: string | null
  homeRecord?: TeamRecord | null
  awayRecord?: TeamRecord | null
  showStatus?: boolean
  className?: string
}) {
  const phase = getFixturePhase(fixture)
  const homeShort = homeTeam?.short_name ?? "???"
  const awayShort = awayTeam?.short_name ?? "???"
  const homeName = homeTeam?.name ?? homeShort
  const awayName = awayTeam?.name ?? awayShort

  return (
    <div className={cn("flex flex-col gap-4 px-0 pt-0 pb-3", className)}>
      {showStatus ? (
        <div className="flex items-center justify-center text-xs font-medium text-muted-foreground">
          {phase === "live" ? (
            <span className="inline-flex items-center gap-1.5 text-pl-pink">
              <span className="size-1.5 animate-pulse rounded-full bg-pl-pink" />
              LIVE {fixture.minutes > 0 ? `${fixture.minutes}'` : ""}
            </span>
          ) : phase === "finished" ? (
            <span>Full time</span>
          ) : (
            <span>{formatMatchKickoffTitle(fixture.kickoff_time)}</span>
          )}
        </div>
      ) : null}

      <div className={MATCH_SIDES_GRID}>
        <div className="flex min-w-0 flex-col items-center gap-3 text-center">
          <TeamCrest
            badgeUrl={homeBadgeUrl}
            shortName={homeShort}
            className="size-11"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{homeName}</p>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
              {homeRecord ? formatTeamRecord(homeRecord) : "0-0-0"}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          {phase === "pre-match" ? (
            <span className="text-2xl font-bold tracking-tight text-muted-foreground">
              vs
            </span>
          ) : (
            <span className="flex items-center justify-center whitespace-nowrap text-3xl font-bold tabular-nums tracking-tight">
              {fixture.team_h_score ?? 0}
              <span className="mx-1 text-muted-foreground">–</span>
              {fixture.team_a_score ?? 0}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col items-center gap-3 text-center">
          <TeamCrest
            badgeUrl={awayBadgeUrl}
            shortName={awayShort}
            className="size-11"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{awayName}</p>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
              {awayRecord ? formatTeamRecord(awayRecord) : "0-0-0"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
