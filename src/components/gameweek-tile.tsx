import { LockIcon } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

import { DataTile } from "@/components/data-tile"
import { MatchDetailPane, MatchOpenPageButton } from "@/components/match-detail-pane"
import { TeamCrest } from "@/components/team-crest"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Drawer,
  DrawerContent,
  DrawerPanel,
  drawerChromeOffsetClassName,
} from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useNow } from "@/hooks/use-now"
import { useEnrichmentMaps } from "@/lib/enrichment/hooks"
import { useFplBootstrap } from "@/lib/fpl/bootstrap-context"
import {
  formatCountdown,
  getPhaseLabel,
  getPhaseSubtitle,
  resolveGameweekPhase,
} from "@/lib/fpl/gameweek"
import type {
  GameweekPhase,
  GameweekTodayFixture,
} from "@/lib/fpl/gameweek"
import { formatExplicitRank, formatOverallRank, getSeasonSummary } from "@/lib/fpl/history"
import { formatTeamProfit } from "@/lib/fpl/transfers"
import { useTeam } from "@/lib/fpl/team-context"
import type { FplFixture } from "@/lib/fpl/types"
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

function FixtureRow({
  fixture,
  isSelected,
  onSelect,
}: {
  fixture: GameweekTodayFixture
  isSelected: boolean
  onSelect: (fixtureId: number) => void
}) {
  const { teamsById } = useFplBootstrap()
  const { teamsByCode } = useEnrichmentMaps()

  const homeTeam = teamsById.get(fixture.homeTeamId)
  const awayTeam = teamsById.get(fixture.awayTeamId)
  const homeBadgeUrl =
    homeTeam?.code != null
      ? (teamsByCode.get(homeTeam.code)?.badgeUrl ?? null)
      : null
  const awayBadgeUrl =
    awayTeam?.code != null
      ? (teamsByCode.get(awayTeam.code)?.badgeUrl ?? null)
      : null

  const score =
    fixture.status === "upcoming"
      ? fixture.kickoffLabel
      : `${fixture.homeScore ?? 0}–${fixture.awayScore ?? 0}`

  return (
    <button
      type="button"
      data-tile-row
      data-selected={isSelected ? "true" : undefined}
      onClick={() => onSelect(fixture.id)}
      className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left text-sm"
    >
      <span className="flex min-w-0 items-center gap-1.5 font-medium tabular-nums">
        <TeamCrest
          badgeUrl={homeBadgeUrl}
          shortName={fixture.homeShort}
          className="size-4"
        />
        <span className="truncate">
          {fixture.homeShort} v {fixture.awayShort}
        </span>
        <TeamCrest
          badgeUrl={awayBadgeUrl}
          shortName={fixture.awayShort}
          className="size-4"
        />
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
    </button>
  )
}

function LiveContent({
  phase,
  selectedFixtureId,
  onSelectFixture,
}: {
  phase: GameweekPhase
  selectedFixtureId: number | null
  onSelectFixture: (fixtureId: number) => void
}) {
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
          <FixtureRow
            key={fixture.id}
            fixture={fixture}
            isSelected={selectedFixtureId === fixture.id}
            onSelect={onSelectFixture}
          />
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
      value={entry.summary_event_points ?? "—"}
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
          value={
            season.rank == null ? "—" : `#${formatExplicitRank(season.rank)}`
          }
          className="text-[clamp(2rem,9vw,3.5rem)] font-bold tracking-tight"
        />
      </div>

      <div className="grid w-full grid-cols-6 gap-1">
        <SeasonStat label="Pts" value={season.totalPoints} />
        <SeasonStat label="Low" value={season.lowestPoints} />
        <SeasonStat label="Avg" value={season.averagePoints} />
        <SeasonStat label="High" value={season.highestPoints} />
        <SeasonStat label="Transfers" value={season.totalTransfers} />
        <SeasonStat label="Profit" value={formatTeamProfit(season.teamValue)} />
      </div>
    </div>
  )
}

function GameweekTileContent({
  phase,
  now,
  selectedFixtureId,
  onSelectFixture,
}: {
  phase: GameweekPhase
  now: Date
  selectedFixtureId: number | null
  onSelectFixture: (fixtureId: number) => void
}) {
  switch (phase.type) {
    case "countdown":
      return <CountdownContent phase={phase} now={now} />
    case "locked":
      return <LockedContent phase={phase} now={now} />
    case "live":
      return (
        <LiveContent
          phase={phase}
          selectedFixtureId={selectedFixtureId}
          onSelectFixture={onSelectFixture}
        />
      )
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
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const now = useNow(1_000)
  const { bootstrap, fixtures, teamsById, isLoading, error } = useFplBootstrap()
  const { isLoading: isTeamLoading, error: teamError, history } = useTeam()
  const [selectedFixture, setSelectedFixture] = useState<FplFixture | null>(
    null
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  const stopCarouselPointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.stopPropagation()
    },
    []
  )

  const handleSelectFixture = useCallback(
    (fixtureId: number) => {
      const fixture = fixtures.find((entry) => entry.id === fixtureId) ?? null
      setSelectedFixture(fixture)
      setDrawerOpen(fixture != null)
    },
    [fixtures]
  )

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setDrawerOpen(open)
    if (!open) {
      setSelectedFixture(null)
    }
  }, [])

  const drawerTitle = selectedFixture
    ? `${teamsById.get(selectedFixture.team_h)?.short_name ?? "Home"} v ${teamsById.get(selectedFixture.team_a)?.short_name ?? "Away"}`
    : "Match centre"

  return (
    <>
      <DataTile
        size="2x1"
        interactive={phase?.type === "live"}
        comingSoon={comingSoon}
        className={cn(isLocked && "opacity-90 saturate-[0.85]", className)}
      >
        <div
          className="flex h-full min-h-0 flex-col"
          onPointerDown={
            phase?.type === "live" ? stopCarouselPointer : undefined
          }
          onPointerUp={phase?.type === "live" ? stopCarouselPointer : undefined}
        >
          <DataTile.Header className="p-3 pb-0">
            <DataTile.Heading>
              <DataTile.Label>
                {phase ? getPhaseLabel(phase) : "Gameweek"}
              </DataTile.Label>
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
              <GameweekTileContent
                phase={phase}
                now={now}
                selectedFixtureId={
                  drawerOpen && selectedFixture ? selectedFixture.id : null
                }
                onSelectFixture={handleSelectFixture}
              />
            ) : null}
          </DataTile.Content>
        </div>
      </DataTile>

      <Drawer open={drawerOpen} onOpenChange={handleDrawerOpenChange}>
        <DrawerContent
          size="lg"
          align={isDesktop ? "dock-right" : "full"}
        >
          <DrawerPanel
            title={drawerTitle}
            leading={
              selectedFixture ? (
                <MatchOpenPageButton fixtureId={selectedFixture.id} />
              ) : undefined
            }
            bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <MatchDetailPane
              fixture={selectedFixture}
              className={cn(drawerChromeOffsetClassName, "overflow-hidden")}
            />
          </DrawerPanel>
        </DrawerContent>
      </Drawer>
    </>
  )
}
