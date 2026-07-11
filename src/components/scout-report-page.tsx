import { useNavigate } from "@tanstack/react-router"
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
import type { FplElement } from "@/lib/fpl/types"
import { hubTileGridClassName } from "@/lib/layout"
import type { PlayerRatingSummary } from "@/lib/ratings/model"
import { usePlayerRatings } from "@/lib/ratings/hooks"
import { SCOUT_PRESETS, type ScoutPreset } from "@/lib/scouts/presets"
import { sortPlayersForScout } from "@/lib/scouts/sort"
import { cn } from "@/lib/utils"

function PlayerGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2.5 px-3 pb-4 sm:grid-cols-2">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-19 rounded-xl" />
      ))}
    </div>
  )
}

type ScoutReportPageProps = {
  scout: ScoutPreset
  titleStyle?: React.CSSProperties
}

export function ScoutReportPage({ scout, titleStyle }: ScoutReportPageProps) {
  const navigate = useNavigate()
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const { bootstrap, teamsById, isLoading: bootstrapLoading, error } =
    useFplBootstrap()
  const { data: ratingsPayload, isLoading: ratingsLoading } = usePlayerRatings()
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  const [mobileSelectedPlayer, setMobileSelectedPlayer] = useState<FplElement | null>(
    null
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  const ratingsById = useMemo(() => {
    const map = new Map<number, PlayerRatingSummary>()
    for (const rating of ratingsPayload?.ratings ?? []) {
      map.set(rating.id, rating)
    }
    return map
  }, [ratingsPayload?.ratings])

  const filteredPlayers = useMemo(() => {
    const players = bootstrap?.elements ?? []
    return sortPlayersForScout(
      players,
      scout,
      scout.sort === "overall" ? ratingsById : undefined
    )
  }, [bootstrap?.elements, ratingsById, scout])

  const selectedPlayer = useMemo(() => {
    if (selectedPlayerId === null) {
      return null
    }

    return filteredPlayers.find((player) => player.id === selectedPlayerId) ?? null
  }, [filteredPlayers, selectedPlayerId])

  const isLoading =
    bootstrapLoading || (scout.sort === "overall" && ratingsLoading)

  useEffect(() => {
    setSelectedPlayerId(null)
    setMobileSelectedPlayer(null)
    setDrawerOpen(false)
  }, [scout.slug])

  useEffect(() => {
    if (!isDesktop || filteredPlayers.length === 0 || isLoading) {
      return
    }

    if (
      selectedPlayerId === null ||
      !filteredPlayers.some((player) => player.id === selectedPlayerId)
    ) {
      setSelectedPlayerId(filteredPlayers[0]?.id ?? null)
    }
  }, [filteredPlayers, isDesktop, isLoading, selectedPlayerId])

  const handleScoutChange = useCallback(
    (slug: string) => {
      if (slug === scout.slug) {
        return
      }

      navigate({
        to: "/scouts/$scoutSlug",
        params: { scoutSlug: slug },
      })
    },
    [navigate, scout.slug]
  )

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
    <DataTile.Header className="flex-col items-stretch gap-3 px-3 pb-2 pt-3 lg:px-4">
      <DataTile.Heading>
        <DataTile.Label style={titleStyle}>{scout.name}</DataTile.Label>
        <DataTile.Subtitle className="text-sm font-medium">
          {scout.subtitle} · {filteredPlayers.length.toLocaleString()} players
        </DataTile.Subtitle>
      </DataTile.Heading>
      <Tabs value={scout.slug} onValueChange={handleScoutChange}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
          {SCOUT_PRESETS.map((preset) => (
            <TabsTrigger
              key={preset.slug}
              value={preset.slug}
              className="shrink-0 rounded-full px-3 py-1 text-xs"
            >
              {preset.name}
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
                contentClassName="grid grid-cols-1 gap-2.5 content-start px-3 pb-4 sm:grid-cols-2"
              >
                {filteredPlayers.map((player) => {
                  const rating = ratingsById.get(player.id)
                  const score =
                    scout.sort === "overall"
                      ? (rating?.overall ?? null)
                      : scout.sort === "bonus"
                        ? player.bonus
                        : player.total_points

                  return (
                    <PlayerScoutCard
                      key={player.id}
                      player={player}
                      teamsById={teamsById}
                      score={score}
                      colorizeScore={scout.sort === "overall"}
                      isSelected={
                        isDesktop
                          ? selectedPlayerId === player.id
                          : mobileSelectedPlayer?.id === player.id && drawerOpen
                      }
                      onSelect={handleSelectPlayer}
                    />
                  )
                })}
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
