import { useCallback, useMemo, useState } from "react"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"

import { LeagueStandingsList } from "@/components/league-standings-list"
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
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  useFplStandingsQuery,
  usePrefetchFplLeagueStandings,
} from "@/lib/fpl/hooks"
import type { LeagueTabId } from "@/lib/fpl/leagues"
import {
  formatLeagueRank,
  getLeagueRankChange,
  getLeaguesForTab,
  isLeagueTabId,
} from "@/lib/fpl/leagues"
import { useLeaguesInspector } from "@/lib/fpl/leagues-inspector-context"
import type { FplClassicLeague, FplEntry } from "@/lib/fpl/types"
import { useTeam } from "@/lib/fpl/team-context"
import { cn } from "@/lib/utils"

const EMPTY_LEAGUE_IDS: readonly number[] = []

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
  selectedLeagueId,
  onSelectLeague,
}: {
  tab: LeagueTabId
  privateLeagues: FplClassicLeague[]
  systemLeagues: FplClassicLeague[]
  isLoggedIn: boolean
  isLoading: boolean
  entry: FplEntry | null
  error: string | null
  selectedLeagueId: number | null
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
      selectedLeagueId={selectedLeagueId}
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
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const { teamId, entry, isLoggedIn, isLoading, error } = useTeam()
  const { selectedLeague, selectLeague, closeLeagueDrawer } =
    useLeaguesInspector()
  const [leagueTab, setLeagueTab] = useState<LeagueTabId>("private")
  const [mobileSelectedLeague, setMobileSelectedLeague] =
    useState<FplClassicLeague | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [leagueIdCopied, setLeagueIdCopied] = useState(false)

  const classicLeagues = entry?.leagues.classic ?? []
  const leagueIds = useMemo(
    () => classicLeagues.map((league) => league.id),
    [classicLeagues]
  )

  usePrefetchFplLeagueStandings(isLoggedIn ? leagueIds : EMPTY_LEAGUE_IDS)

  const drawerLeague = isDesktop ? selectedLeague : mobileSelectedLeague
  const isDrawerOpen = isDesktop
    ? selectedLeague !== null
    : drawerOpen && mobileSelectedLeague !== null

  const standingsQuery = useFplStandingsQuery(drawerLeague?.id, {
    enabled: isDrawerOpen && drawerLeague !== null,
  })

  const standings = standingsQuery.data?.standings.results ?? []
  const standingsLoading =
    standingsQuery.isPending && standings.length === 0
  const standingsError = standingsQuery.error
    ? "Could not load standings."
    : null

  const privateLeagues = getLeaguesForTab(classicLeagues, "private")
  const systemLeagues = getLeaguesForTab(classicLeagues, "system")

  const selectedLeagueId = isDesktop
    ? (selectedLeague?.id ?? null)
    : drawerOpen
      ? (mobileSelectedLeague?.id ?? null)
      : null

  const handleLeagueTabChange = useCallback(
    (value: string | number | null) => {
      if (typeof value !== "string" || !isLeagueTabId(value)) {
        return
      }

      setLeagueTab(value)
      if (isDesktop) {
        closeLeagueDrawer()
      } else {
        setMobileSelectedLeague(null)
        setDrawerOpen(false)
      }
    },
    [closeLeagueDrawer, isDesktop]
  )

  const stopCarouselPointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.stopPropagation()
    },
    []
  )

  const handleSelectLeague = useCallback(
    (league: FplClassicLeague) => {
      if (isDesktop) {
        if (selectedLeague?.id === league.id) {
          closeLeagueDrawer()
          return
        }

        selectLeague(league)
        setLeagueIdCopied(false)
        return
      }

      setMobileSelectedLeague(league)
      setDrawerOpen(true)
      setLeagueIdCopied(false)
    },
    [closeLeagueDrawer, selectedLeague?.id, isDesktop, selectLeague]
  )

  const handleDrawerOpenChange = useCallback(
    (open: boolean) => {
      if (isDesktop) {
        if (!open) {
          closeLeagueDrawer()
        }
        return
      }

      setDrawerOpen(open)
      if (!open) {
        setMobileSelectedLeague(null)
      }
    },
    [closeLeagueDrawer, isDesktop]
  )

  const copyLeagueId = useCallback(async () => {
    if (!drawerLeague) {
      return
    }

    try {
      await navigator.clipboard.writeText(String(drawerLeague.id))
      setLeagueIdCopied(true)
      window.setTimeout(() => setLeagueIdCopied(false), 2000)
    } catch {
      // Clipboard unavailable — ignore silently
    }
  }, [drawerLeague])

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
              selectedLeagueId={selectedLeagueId}
              onSelectLeague={handleSelectLeague}
            />
          </DataTile.Content>
        </Tabs>
      </DataTile>

      <Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
        <DrawerContent size="md" align={isDesktop ? "dock-right" : "full"}>
          <DrawerPanel
            title={drawerLeague?.name ?? "League"}
            leading={
              drawerLeague ? (
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
            <LeagueStandingsList
              standings={standings}
              currentTeamId={teamId}
              isLoading={standingsLoading}
              error={standingsError}
              fadeFrom="--popover"
              contentClassName={cn(drawerChromeOffsetClassName, "pb-4")}
            />
          </DrawerPanel>
        </DrawerContent>
      </Drawer>
    </>
  )
}
