import { useCallback, useState } from "react"
import { useServerFn } from "@tanstack/react-start"
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { DataTile } from "@/components/data-tile"
import {
  formatLeagueRank,
  getLeagueRankChange,
  getLeaguesForTab,
  isLeagueTabId,
  type LeagueTabId,
} from "@/lib/fpl/leagues"
import { getFplLeagueStandings } from "@/lib/fpl/server"
import type { FplClassicLeague, FplLeagueStanding } from "@/lib/fpl/types"
import { useTeam } from "@/lib/fpl/team-context"
import { cn } from "@/lib/utils"

function RankChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-chart-2">
        <ArrowUpIcon className="size-3" />
        {change}
      </span>
    )
  }

  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-destructive">
        <ArrowDownIcon className="size-3" />
        {Math.abs(change)}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center text-xs text-muted-foreground">
      <MinusIcon className="size-3" />
    </span>
  )
}

function LeagueRow({
  league,
  isSelected,
  onSelect,
}: {
  league: FplClassicLeague
  isSelected: boolean
  onSelect: (league: FplClassicLeague) => void
}) {
  const rankChange = getLeagueRankChange(league)

  return (
    <button
      type="button"
      data-tile-row
      data-selected={isSelected ? "true" : undefined}
      onClick={() => onSelect(league)}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left active:scale-[0.99]"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{league.name}</span>
        <span className="text-xs" data-tile-row-muted>
          {league.rank_count.toLocaleString()} teams
        </span>
      </div>
      <div className="flex shrink-0 items-center">
        <span className="flex w-3.5 shrink-0 justify-center" aria-hidden="true">
          {rankChange > 0 ? (
            <ArrowUpIcon className="size-3.5 text-chart-2/70" />
          ) : rankChange < 0 ? (
            <ArrowDownIcon className="size-3.5 text-destructive/70" />
          ) : null}
        </span>
        <span className="text-base font-semibold tabular-nums">
          {formatLeagueRank(league.entry_rank, league.rank_count)}
        </span>
      </div>
    </button>
  )
}

function StandingRow({
  standing,
  isCurrentTeam,
}: {
  standing: FplLeagueStanding
  isCurrentTeam: boolean
}) {
  const rankChange = standing.last_rank - standing.rank

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-2",
        isCurrentTeam && "bg-chart-2/10 ring-1 ring-chart-2/20"
      )}
    >
      <span className="w-8 shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
        {standing.rank}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{standing.entry_name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {standing.player_name}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-sm font-semibold tabular-nums">
          {standing.total}
        </span>
        <RankChangeIndicator change={rankChange} />
      </div>
    </div>
  )
}

function LeagueList({
  leagues,
  selectedLeagueId,
  onSelect,
}: {
  leagues: FplClassicLeague[]
  selectedLeagueId: number | null
  onSelect: (league: FplClassicLeague) => void
}) {
  return (
    <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
      {leagues.map((league) => (
        <LeagueRow
          key={league.id}
          league={league}
          isSelected={selectedLeagueId === league.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function LeagueEmptyState({ tab }: { tab: LeagueTabId }) {
  if (tab === "private") {
    return (
      <DataTile.EmptyState>
        No private leagues joined yet. Enter a league code on FPL to subscribe.
      </DataTile.EmptyState>
    )
  }

  return (
    <DataTile.EmptyState>
      No global leagues available for this team.
    </DataTile.EmptyState>
  )
}

export function LeaguesTile({ className }: { className?: string }) {
  const { teamId, entry, isLoggedIn, isLoading, error } = useTeam()
  const fetchStandings = useServerFn(getFplLeagueStandings)
  const [leagueTab, setLeagueTab] = useState<LeagueTabId>("private")
  const [selectedLeague, setSelectedLeague] = useState<FplClassicLeague | null>(
    null
  )
  const [standings, setStandings] = useState<FplLeagueStanding[]>([])
  const [standingsLoading, setStandingsLoading] = useState(false)
  const [standingsError, setStandingsError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const classicLeagues = entry?.leagues.classic ?? []
  const privateLeagues = getLeaguesForTab(classicLeagues, "private")
  const systemLeagues = getLeaguesForTab(classicLeagues, "system")

  const handleLeagueTabChange = useCallback((value: string | number | null) => {
    if (typeof value !== "string" || !isLeagueTabId(value)) {
      return
    }

    setLeagueTab(value)
    setSelectedLeague(null)
  }, [])

  const stopCarouselPointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.stopPropagation()
    },
    []
  )

  const handleSelectLeague = useCallback(
    async (league: FplClassicLeague) => {
      setSelectedLeague(league)
      setDrawerOpen(true)
      setStandingsLoading(true)
      setStandingsError(null)
      setStandings([])

      try {
        const response = await fetchStandings({ data: { leagueId: league.id } })
        setStandings(response.standings.results)
      } catch {
        setStandingsError("Could not load standings.")
      } finally {
        setStandingsLoading(false)
      }
    },
    [fetchStandings]
  )

  const renderLeaguePanel = (tab: LeagueTabId) => {
    const leagues = tab === "private" ? privateLeagues : systemLeagues

    if (!isLoggedIn) {
      return (
        <DataTile.EmptyState>
          Connect your FPL team to see positions in your leagues.
        </DataTile.EmptyState>
      )
    }

    if (isLoading && !entry) {
      return (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )
    }

    if (error && !entry) {
      return (
        <DataTile.EmptyState className="text-destructive">
          {error}
        </DataTile.EmptyState>
      )
    }

    if (leagues.length === 0) {
      return <LeagueEmptyState tab={tab} />
    }

    return (
      <LeagueList
        leagues={leagues}
        selectedLeagueId={drawerOpen ? (selectedLeague?.id ?? null) : null}
        onSelect={handleSelectLeague}
      />
    )
  }

  return (
    <>
      <DataTile size="2x2" interactive className={className}>
        <Tabs
          value={leagueTab}
          onValueChange={handleLeagueTabChange}
          className="flex h-full min-h-0 flex-col gap-0"
          onPointerDown={stopCarouselPointer}
          onPointerUp={stopCarouselPointer}
        >
          <DataTile.Header className="relative z-10 pb-2 pt-3">
            <TabsList className="relative z-10 h-8 w-full">
              <TabsTrigger value="private" className="text-xs">
                My leagues
              </TabsTrigger>
              <TabsTrigger value="system" className="text-xs">
                Global leagues
              </TabsTrigger>
            </TabsList>
          </DataTile.Header>

          <DataTile.Content
            align="between"
            className="min-h-0 flex-1 gap-2 overflow-hidden pt-0"
          >
            {renderLeaguePanel(leagueTab)}
          </DataTile.Content>
        </Tabs>
      </DataTile>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent variant="flush" className="flex max-h-[92dvh] flex-col">
          <DrawerHeader className="shrink-0 border-b border-border/40 pb-4">
            <DrawerTitle>{selectedLeague?.name ?? "League"}</DrawerTitle>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {standingsLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : standingsError ? (
              <p className="text-sm text-destructive">{standingsError}</p>
            ) : (
              standings.map((standing) => (
                <StandingRow
                  key={standing.id}
                  standing={standing}
                  isCurrentTeam={standing.entry === teamId}
                />
              ))
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
