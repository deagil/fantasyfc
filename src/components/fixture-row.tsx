import { DifficultyDots, TeamCrest } from "@/components/team-crest"
import { getFixturePhase } from "@/lib/fixtures/form"
import { formatFixtureKickoff } from "@/lib/fixtures/kickoff"
import type { FplFixture, FplTeam } from "@/lib/fpl/types"
import { cn } from "@/lib/utils"

function formatLiveMinuteLabel(minutes: number | null | undefined): string {
  return minutes != null && minutes > 0 ? `${minutes}'` : "LIVE"
}

export function LiveScoreCluster({
  homeScore,
  awayScore,
  minutes,
  className,
}: {
  homeScore: number | null
  awayScore: number | null
  minutes: number | null | undefined
  className?: string
}) {
  const home = homeScore ?? 0
  const away = awayScore ?? 0
  const minuteLabel = formatLiveMinuteLabel(minutes)
  const statusLabel =
    minutes != null && minutes > 0 ? `${minutes} minutes` : "live"

  return (
    <div
      className={cn(
        "flex min-w-16 shrink-0 items-center justify-center gap-1.5",
        className
      )}
      aria-label={`${home}–${away}, ${statusLabel}`}
    >
      <span
        aria-hidden="true"
        className="text-sm font-semibold tabular-nums leading-none"
      >
        {home}
      </span>
      <span
        aria-hidden="true"
        className="rounded-full bg-pl-pink/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-pl-pink"
      >
        {minuteLabel}
      </span>
      <span
        aria-hidden="true"
        className="text-sm font-semibold tabular-nums leading-none"
      >
        {away}
      </span>
    </div>
  )
}

export function FixtureRow({
  fixture,
  homeTeam,
  awayTeam,
  homeBadgeUrl,
  awayBadgeUrl,
  isSelected = false,
  onSelect,
  compact = false,
}: {
  fixture: FplFixture
  homeTeam: FplTeam | undefined
  awayTeam: FplTeam | undefined
  homeBadgeUrl?: string | null
  awayBadgeUrl?: string | null
  isSelected?: boolean
  onSelect?: (fixture: FplFixture) => void
  compact?: boolean
}) {
  const phase = getFixturePhase(fixture)
  const homeShort = homeTeam?.short_name ?? "???"
  const awayShort = awayTeam?.short_name ?? "???"

  const scoreOrTime =
    phase === "pre-match"
      ? formatFixtureKickoff(fixture.kickoff_time, {
          includeWeekday: compact,
        })
      : `${fixture.team_h_score ?? 0}–${fixture.team_a_score ?? 0}`

  const content = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
          {!compact ? (
            <DifficultyDots
              difficulty={fixture.team_h_difficulty}
              className="hidden sm:flex"
            />
          ) : null}
          <span className="truncate text-sm font-semibold tabular-nums">
            {homeShort}
          </span>
          <TeamCrest badgeUrl={homeBadgeUrl} shortName={homeShort} />
        </div>

        {phase === "live" ? (
          <LiveScoreCluster
            homeScore={fixture.team_h_score}
            awayScore={fixture.team_a_score}
            minutes={fixture.minutes}
          />
        ) : (
          <div
            className={cn(
              "flex shrink-0 flex-col items-center justify-center",
              compact && phase === "pre-match" ? "w-[4.75rem]" : "w-14"
            )}
          >
            <span
              className={cn(
                "text-center font-semibold tabular-nums",
                compact && phase === "pre-match"
                  ? "text-[11px] leading-tight tracking-wide uppercase"
                  : "text-sm",
                phase === "pre-match" && "text-muted-foreground"
              )}
            >
              {scoreOrTime}
            </span>
            {phase === "finished" ? (
              <span className="text-[10px] font-medium text-muted-foreground">
                FT
              </span>
            ) : null}
          </div>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <TeamCrest badgeUrl={awayBadgeUrl} shortName={awayShort} />
          <span className="truncate text-sm font-semibold tabular-nums">
            {awayShort}
          </span>
          {!compact ? (
            <DifficultyDots
              difficulty={fixture.team_a_difficulty}
              className="hidden sm:flex"
            />
          ) : null}
        </div>
      </div>
    </>
  )

  if (onSelect) {
    return (
      <button
        type="button"
        data-tile-row
        data-selected={isSelected ? "true" : undefined}
        onClick={() => onSelect(fixture)}
        className={cn(
          "flex w-full min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left active:scale-[0.99]",
          compact && "px-2 py-2"
        )}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center gap-2 rounded-xl px-3 py-2.5",
        compact && "px-2 py-2"
      )}
    >
      {content}
    </div>
  )
}
