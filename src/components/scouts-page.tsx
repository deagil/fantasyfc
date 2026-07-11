import { useCallback, useEffect, useMemo, useState } from "react"

import { DataTile } from "@/components/data-tile"
import { PlayerDetailPane } from "@/components/player-detail-pane"
import { PlayerScoutCard } from "@/components/player-scout-card"
import { ScrollFade } from "@/components/scroll-fade"
import {
  Drawer,
  DrawerContent,
  DrawerPanel,
  drawerChromeOffsetClassName,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useFplBootstrap } from "@/lib/fpl/bootstrap-context"
import {
  filterPlayersByPosition,
  isPositionFilterId,
  POSITION_FILTERS,
  sortPlayersByPoints,
  type PositionFilterId,
} from "@/lib/fpl/players"
import type { FplElement } from "@/lib/fpl/types"
import { hubTileGridClassName } from "@/lib/layout"
import { cn } from "@/lib/utils"

function PlayerGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 px-3 pb-4">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-22 rounded-xl" />
      ))}
    </div>
  )
}

export function ScoutsPage() {
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const { bootstrap, teamsById, isLoading, error } = useFplBootstrap()
  const [positionFilter, setPositionFilter] = useState<PositionFilterId>("all")
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  const [mobileSelectedPlayer, setMobileSelectedPlayer] = useState<FplElement | null>(
    null
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filteredPlayers = useMemo(() => {
    const players = bootstrap?.elements ?? []
    return sortPlayersByPoints(filterPlayersByPosition(players, positionFilter))
  }, [bootstrap?.elements, positionFilter])

  const selectedPlayer = useMemo(() => {
    if (selectedPlayerId === null) {
      return null
    }

    return filteredPlayers.find((player) => player.id === selectedPlayerId) ?? null
  }, [filteredPlayers, selectedPlayerId])

  useEffect(() => {
    if (!isDesktop || filteredPlayers.length === 0) {
      return
    }

    if (
      selectedPlayerId === null ||
      !filteredPlayers.some((player) => player.id === selectedPlayerId)
    ) {
      setSelectedPlayerId(filteredPlayers[0]?.id ?? null)
    }
  }, [filteredPlayers, isDesktop, selectedPlayerId])

  const handlePositionFilterChange = useCallback((value: string) => {
    if (!isPositionFilterId(value)) {
      return
    }

    setPositionFilter(value)
    setSelectedPlayerId(null)
    setMobileSelectedPlayer(null)
    setDrawerOpen(false)
  }, [])

  const handleSelectPlayer = useCallback(
    (player: FplElement) => {
      if (isDesktop) {
        setSelectedPlayerId((currentId) =>
          currentId === player.id ? null : player.id
        )
        return
      }

      setMobileSelectedPlayer(player)
      setDrawerOpen(true)
    },
    [isDesktop]
  )

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setDrawerOpen(open)
    if (!open) {
      setMobileSelectedPlayer(null)
    }
  }, [])

  const listHeader = (
    <DataTile.Header className="flex-col items-stretch gap-3 pb-2 pt-3">
      <DataTile.Heading>
        <DataTile.Label style={{ viewTransitionName: "vt-scouts-title" }}>
          Scouts
        </DataTile.Label>
        <DataTile.Subtitle className="text-sm font-medium">
          {filteredPlayers.length.toLocaleString()} players
        </DataTile.Subtitle>
      </DataTile.Heading>
      <Tabs value={positionFilter} onValueChange={handlePositionFilterChange}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
          {POSITION_FILTERS.map((filter) => (
            <TabsTrigger
              key={filter}
              value={filter}
              className="shrink-0 rounded-full px-3 py-1 text-xs uppercase"
            >
              {filter}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </DataTile.Header>
  )

  return (
    <>
      <div className={hubTileGridClassName}>
        <DataTile
          interactive
          className="col-span-2 row-span-3 lg:col-start-1 lg:row-start-1"
        >
          {listHeader}
          <DataTile.Content
            align="between"
            className="min-h-0 flex-1 gap-2 overflow-hidden px-0 pt-0"
          >
            {isLoading ? (
              <PlayerGridSkeleton />
            ) : error ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">{error}</p>
            ) : (
              <ScrollFade
                className="flex min-h-0 w-full min-w-0 flex-1"
                contentClassName="grid grid-cols-2 gap-2 px-3 pb-4"
              >
                {filteredPlayers.map((player) => (
                  <PlayerScoutCard
                    key={player.id}
                    player={player}
                    teamsById={teamsById}
                    isSelected={
                      isDesktop
                        ? selectedPlayerId === player.id
                        : mobileSelectedPlayer?.id === player.id && drawerOpen
                    }
                    onSelect={handleSelectPlayer}
                  />
                ))}
              </ScrollFade>
            )}
          </DataTile.Content>
        </DataTile>

        <DataTile
          interactive
          className="hidden col-span-2 row-span-3 lg:col-start-3 lg:row-start-1 lg:flex"
        >
          <DataTile.Header className="pb-2 pt-3">
            <DataTile.Heading>
              <DataTile.Label>Scout report</DataTile.Label>
            </DataTile.Heading>
          </DataTile.Header>
          <DataTile.Content
            align="between"
            className="min-h-0 flex-1 overflow-hidden px-0 pt-0"
          >
            <PlayerDetailPane
              player={selectedPlayer}
              teamsById={teamsById}
              className="overflow-y-auto"
            />
          </DataTile.Content>
        </DataTile>
      </div>

      {!isDesktop ? (
        <Drawer open={drawerOpen} onOpenChange={handleDrawerOpenChange}>
          <DrawerContent size="md" align="full">
            <DrawerPanel
              title={mobileSelectedPlayer?.web_name ?? "Scout report"}
              bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <PlayerDetailPane
                player={mobileSelectedPlayer}
                teamsById={teamsById}
                className={cn(drawerChromeOffsetClassName, "overflow-y-auto")}
              />
            </DrawerPanel>
          </DrawerContent>
        </Drawer>
      ) : null}
    </>
  )
}
