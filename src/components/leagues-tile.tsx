import { useCallback, useState } from "react"
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react"

import { ScrollFade } from "@/components/scroll-fade"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Drawer,
  DrawerContent,
  DrawerPanel,
  drawerChromeOffsetClassName,
} from "@/components/ui/drawer"
import { DataTile } from "@/components/data-tile"
import { useFplStandingsQuery } from "@/lib/fpl/hooks"
import {
  formatLeagueRank,
  getLeagueRankChange,
  getLeaguesForTab,
  isLeagueTabId,
  type LeagueTabId,
} from "@/lib/fpl/leagues"
import type { FplClassicLeague, FplEntry, FplLeagueStanding } from "@/lib/fpl/types"
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
        "flex w-full items-center gap-3 px-4 py-2.5 text-left active:scale-[0.99]"
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
        "flex w-full items-center gap-3 px-4 py-2.5",
        isCurrentTeam && "bg-chart-2/10 ring-1 ring-inset ring-chart-2/20"
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
    <ScrollFade
      className="flex min-h-0 w-full min-w-0 flex-1"
      contentClassName="flex w-full flex-col"
    >
      {leagues.map((league) => (
        <LeagueRow
          key={league.id}
          league={league}
          isSelected={selectedLeagueId === league.id}
          onSelect={onSelect}
        />
      ))}
    </ScrollFade>
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

function LeaguePanel({
  tab,
  privateLeagues,
  systemLeagues,
  isLoggedIn,
  isLoading,
  entry,
  error,
  drawerOpen,
  selectedLeague,
  onSelectLeague,
}: {
  tab: LeagueTabId
  privateLeagues: FplClassicLeague[]
  systemLeagues: FplClassicLeague[]
  isLoggedIn: boolean
  isLoading: boolean
  entry: FplEntry | null
  error: string | null
  drawerOpen: boolean
  selectedLeague: FplClassicLeague | null
  onSelectLeague: (league: FplClassicLeague) => void
}) {
  const leagues = tab === "private" ? privateLeagues : systemLeagues

  if (!isLoggedIn) {
    return (
      <DataTile.EmptyState className="px-3 lg:px-4">
        Connect your FPL team to see positions in your leagues.
      </DataTile.EmptyState>
    )
  }

  if (isLoading && !entry) {
    return (
      <div className="flex flex-col gap-2 px-3 lg:px-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (error && !entry) {
    return (
      <DataTile.EmptyState className="px-3 text-destructive lg:px-4">
        {error}
      </DataTile.EmptyState>
    )
  }

  if (leagues.length === 0) {
    return (
      <div className="px-3 lg:px-4">
        <LeagueEmptyState tab={tab} />
      </div>
    )
  }

  return (
    <LeagueList
      leagues={leagues}
      selectedLeagueId={drawerOpen ? (selectedLeague?.id ?? null) : null}
      onSelect={onSelectLeague}
    />
  )
}

export function LeaguesTile({
  className,
  comingSoon = false,
}: {
  className?: string
  comingSoon?: boolean
}) {
  const { teamId, entry, isLoggedIn, isLoading, error } = useTeam()
  const [leagueTab, setLeagueTab] = useState<LeagueTabId>("private")
  const [selectedLeague, setSelectedLeague] = useState<FplClassicLeague | null>(
    null
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [leagueIdCopied, setLeagueIdCopied] = useState(false)

  const standingsQuery = useFplStandingsQuery(selectedLeague?.id, {
    enabled: drawerOpen && selectedLeague !== null,
  })

  const standings = standingsQuery.data?.standings.results ?? []
  const standingsLoading =
    standingsQuery.isPending && standings.length === 0
  const standingsError = standingsQuery.error
    ? "Could not load standings."
    : null

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

  const handleSelectLeague = useCallback((league: FplClassicLeague) => {
    setSelectedLeague(league)
    setDrawerOpen(true)
    setLeagueIdCopied(false)
  }, [])

  const copyLeagueId = useCallback(async () => {
    if (!selectedLeague) {
      return
    }

    try {
      await navigator.clipboard.writeText(String(selectedLeague.id))
      setLeagueIdCopied(true)
      window.setTimeout(() => setLeagueIdCopied(false), 2000)
    } catch {
      // Clipboard unavailable — ignore silently
    }
  }, [selectedLeague])

  return (
    <>
      <DataTile size="2x2" interactive comingSoon={comingSoon} className={className}>
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
            className="min-h-0 flex-1 gap-2 overflow-hidden px-0 pt-0"
          >
            <LeaguePanel
              tab={leagueTab}
              privateLeagues={privateLeagues}
              systemLeagues={systemLeagues}
              isLoggedIn={isLoggedIn}
              isLoading={isLoading}
              entry={entry}
              error={error}
              drawerOpen={drawerOpen}
              selectedLeague={selectedLeague}
              onSelectLeague={handleSelectLeague}
            />
          </DataTile.Content>
        </Tabs>
      </DataTile>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent size="md">
          <DrawerPanel
            title={selectedLeague?.name ?? "League"}
            leading={
              selectedLeague ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shell-chrome-btn"
                  onClick={() => void copyLeagueId()}
                >
                  {leagueIdCopied ? "Copied" : "Copy ID"}
                </Button>
              ) : undefined
            }
            bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <ScrollFade
              className="flex min-h-0 w-full flex-1"
              fadeFrom="--popover"
              contentClassName={cn(
                drawerChromeOffsetClassName,
                "flex w-full flex-col pb-4"
              )}
            >
              {standingsLoading ? (
                <div className="flex w-full flex-col gap-2 px-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : standingsError ? (
                <p className="px-4 text-sm text-destructive">{standingsError}</p>
              ) : (
                standings.map((standing) => (
                  <StandingRow
                    key={standing.id}
                    standing={standing}
                    isCurrentTeam={standing.entry === teamId}
                  />
                ))
              )}
            </ScrollFade>
          </DrawerPanel>
        </DrawerContent>
      </Drawer>
    </>
  )
}
