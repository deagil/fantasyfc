import { LockIcon } from "lucide-react"
import { useMemo } from "react"

import { DataTile } from "@/components/data-tile"
import { Skeleton } from "@/components/ui/skeleton"
import { useNow } from "@/hooks/use-now"
import { useFplBootstrap } from "@/lib/fpl/bootstrap-context"
import {
  formatCountdown,
  getPhaseSubtitle,
  resolveGameweekPhase,
  type GameweekPhase,
  type GameweekTodayFixture,
} from "@/lib/fpl/gameweek"
import { formatExplicitRank, formatOverallRank, getSeasonSummary } from "@/lib/fpl/history"
import { formatTeamProfit } from "@/lib/fpl/transfers"
import { useTeam } from "@/lib/fpl/team-context"
import { cn } from "@/lib/utils"

function TeamHeroSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Skeleton className="h-12 w-24" />
      <Skeleton className="h-3 w-28" />
    </div>
  )
}

function CountdownContent({ phase, now }: { phase: GameweekPhase; now: Date }) {
  if (phase.type !== "countdown") {
    return null
  }

  const remainingMs = phase.deadline.getTime() - now.getTime()

  return (
    <DataTile.HeroStat
      value={formatCountdown(remainingMs)}
      caption={`until GW ${phase.event.id} deadline`}
      tone="chart1"
      valueClassName="text-4xl"
    />
  )
}

function LockedContent({ phase, now }: { phase: GameweekPhase; now: Date }) {
  if (phase.type !== "locked") {
    return null
  }

  const remainingMs = phase.firstKickoff.getTime() - now.getTime()

  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl bg-foreground/[0.04] px-4 py-4 text-center">
      <div className="flex size-9 items-center justify-center rounded-full bg-foreground/[0.06]">
        <LockIcon className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">Squad locked</p>
      <DataTile.Value
        value={formatCountdown(remainingMs)}
        className="text-3xl text-muted-foreground"
      />
      <p className="text-xs text-muted-foreground">until kickoff</p>
    </div>
  )
}

function FixtureRow({ fixture }: { fixture: GameweekTodayFixture }) {
  const score =
    fixture.status === "upcoming"
      ? fixture.kickoffLabel
      : `${fixture.homeScore ?? 0}-${fixture.awayScore ?? 0}`

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="min-w-0 truncate font-medium tabular-nums">
        {fixture.homeShort} v {fixture.awayShort}
      </span>
      <span
        className={cn(
          "shrink-0 text-xs font-medium tabular-nums",
          fixture.status === "live" && "text-chart-2",
          fixture.status !== "live" && "text-muted-foreground"
        )}
      >
        {fixture.status === "live" && fixture.minutes !== null
          ? `${fixture.minutes}'`
          : score}
      </span>
    </div>
  )
}

function LiveContent({ phase }: { phase: GameweekPhase }) {
  if (phase.type !== "live") {
    return null
  }

  if (phase.todayFixtures.length === 0) {
    return (
      <DataTile.EmptyState className="text-center">
        No matches today.
      </DataTile.EmptyState>
    )
  }

  const liveCount = phase.todayFixtures.filter(
    (fixture) => fixture.status === "live"
  ).length

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-center text-xs text-muted-foreground">
        {liveCount > 0
          ? `${liveCount} live now`
          : `${phase.todayFixtures.length} today`}
      </p>
      <div className="flex flex-col gap-1.5">
        {phase.todayFixtures.slice(0, 3).map((fixture) => (
          <FixtureRow key={fixture.id} fixture={fixture} />
        ))}
      </div>
    </div>
  )
}

function PostGameweekContent({ phase }: { phase: GameweekPhase }) {
  const { entry, isLoggedIn, isLoading } = useTeam()

  if (phase.type !== "post-gameweek") {
    return null
  }

  if (!isLoggedIn) {
    return (
      <DataTile.EmptyState className="text-center">
        Connect your team to see your GW {phase.event.id} result.
      </DataTile.EmptyState>
    )
  }

  if (isLoading && !entry) {
    return <TeamHeroSkeleton />
  }

  if (!entry) {
    return null
  }

  return (
    <DataTile.HeroStat
      value={entry.summary_event_points}
      caption={`GW ${phase.event.id} · ${formatOverallRank(entry.summary_event_rank)} rank`}
      tone="chart2"
      valueClassName="text-4xl"
    />
  )
}

function SeasonStat({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 text-center">
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums leading-none">{value}</span>
    </div>
  )
}

function OffSeasonContent() {
  const { entry, history, isLoggedIn, isLoading } = useTeam()

  if (!isLoggedIn) {
    return (
      <DataTile.EmptyState className="text-center">
        Season finished. Connect your team to see your final standing.
      </DataTile.EmptyState>
    )
  }

  if (isLoading && (!entry || !history)) {
    return <TeamHeroSkeleton />
  }

  if (!entry || !history) {
    return null
  }

  const season = getSeasonSummary(entry, history)

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <DataTile.Value
          value={`#${formatExplicitRank(season.rank)}`}
          className="text-[clamp(2rem,9vw,3.5rem)] font-bold tracking-tight"
        />
      </div>

      <div className="grid w-full grid-cols-6 gap-1">
        <SeasonStat label="Pts" value={season.totalPoints} />
        <SeasonStat label="Low" value={season.lowestPoints} />
        <SeasonStat label="Avg" value={season.averagePoints} />
        <SeasonStat label="High" value={season.highestPoints} />
        <SeasonStat label="Xfers" value={season.totalTransfers} />
        <SeasonStat label="Profit" value={formatTeamProfit(season.teamValue)} />
      </div>
    </div>
  )
}

function GameweekTileContent({
  phase,
  now,
}: {
  phase: GameweekPhase
  now: Date
}) {
  switch (phase.type) {
    case "countdown":
      return <CountdownContent phase={phase} now={now} />
    case "locked":
      return <LockedContent phase={phase} now={now} />
    case "live":
      return <LiveContent phase={phase} />
    case "post-gameweek":
      return <PostGameweekContent phase={phase} />
    case "off-season":
      return <OffSeasonContent />
    default: {
      const exhaustiveCheck: never = phase
      return exhaustiveCheck
    }
  }
}

function phaseNeedsTeamData(phase: GameweekPhase | null): boolean {
  return phase?.type === "post-gameweek" || phase?.type === "off-season"
}

function phaseNeedsHistory(phase: GameweekPhase | null): boolean {
  return phase?.type === "off-season"
}

export function GameweekTile({
  className,
  comingSoon = false,
}: {
  className?: string
  comingSoon?: boolean
}) {
  const now = useNow(1_000)
  const { bootstrap, fixtures, teamsById, isLoading, error } = useFplBootstrap()
  const { isLoading: isTeamLoading, error: teamError, history } = useTeam()

  const phase = useMemo(() => {
    if (!bootstrap) {
      return null
    }

    return resolveGameweekPhase(now, bootstrap.events, fixtures, teamsById)
  }, [bootstrap, fixtures, now, teamsById])

  const isLocked = phase?.type === "locked"
  const needsTeam = phaseNeedsTeamData(phase)
  const needsHistory = phaseNeedsHistory(phase)
  const isTeamDataLoading =
    isTeamLoading && (needsTeam || (needsHistory && !history))

  return (
    <DataTile
      size="2x1"
      comingSoon={comingSoon}
      className={cn(isLocked && "opacity-90 saturate-[0.85]", className)}
    >
      <div className="flex h-full min-h-0 flex-col">
        <DataTile.Header className="p-3 pb-0">
          <DataTile.Heading>
            <DataTile.Label>Gameweek</DataTile.Label>
            {phase ? (
              <DataTile.Subtitle>{getPhaseSubtitle(phase)}</DataTile.Subtitle>
            ) : null}
          </DataTile.Heading>
        </DataTile.Header>

        <DataTile.Content
          align={phase?.type === "off-season" ? "between" : "center"}
          className={cn(
            "flex-1 p-3 pt-2 pb-3",
            phase?.type === "off-season" && "min-h-0"
          )}
        >
          {isLoading && !bootstrap ? (
            <TeamHeroSkeleton />
          ) : error && !bootstrap ? (
            <DataTile.EmptyState className="text-destructive">
              {error}
            </DataTile.EmptyState>
          ) : isTeamDataLoading ? (
            <TeamHeroSkeleton />
          ) : teamError && needsTeam ? (
            <DataTile.EmptyState className="text-destructive">
              {teamError}
            </DataTile.EmptyState>
          ) : phase ? (
            <GameweekTileContent phase={phase} now={now} />
          ) : null}
        </DataTile.Content>
      </div>
    </DataTile>
  )
}
