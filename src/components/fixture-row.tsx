import { DifficultyDots, TeamCrest } from "@/components/team-crest"
import { getFixturePhase } from "@/lib/fixtures/form"
import { formatFixtureKickoff } from "@/lib/fixtures/kickoff"
import type { FplFixture, FplTeam } from "@/lib/fpl/types"
import { cn } from "@/lib/utils"

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

  const statusLabel =
    phase === "finished"
      ? "FT"
      : phase === "live"
        ? fixture.minutes > 0
          ? `${fixture.minutes}'`
          : "LIVE"
        : null

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
              phase === "live" && "text-chart-2",
              phase === "pre-match" && "text-muted-foreground"
            )}
          >
            {scoreOrTime}
          </span>
          {statusLabel && phase === "finished" ? (
            <span className="text-[10px] font-medium text-muted-foreground">
              {statusLabel}
            </span>
          ) : null}
          {phase === "live" ? (
            <span className="rounded-full bg-pl-pink/15 px-1.5 text-[10px] font-semibold tracking-wide text-pl-pink">
              LIVE
            </span>
          ) : null}
        </div>

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
