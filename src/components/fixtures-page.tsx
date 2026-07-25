import { useCallback, useEffect, useMemo, useState } from "react"

import { DataTile } from "@/components/data-tile"
import { FixtureRow } from "@/components/fixture-row"
import { GameweekPager } from "@/components/gameweek-pager"
import { MatchDetailPane } from "@/components/match-detail-pane"
import { ScrollFade } from "@/components/scroll-fade"
import {
  Drawer,
  DrawerContent,
  DrawerPanel,
  drawerChromeOffsetClassName,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useEnrichmentMaps } from "@/lib/enrichment/hooks"
import { getEventFixtures, groupFixturesByDay } from "@/lib/fixtures/group"
import { getGameweekShapes } from "@/lib/fixtures/gameweek-shape"
import { getFixturePhase } from "@/lib/fixtures/form"
import { useFplBootstrap } from "@/lib/fpl/bootstrap-context"
import { useFplSeasonFixturesQuery } from "@/lib/fpl/hooks"
import type { FplFixture } from "@/lib/fpl/types"
import { hubTileGridClassName } from "@/lib/layout"
import { cn } from "@/lib/utils"

function FixtureListSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-3 pb-4">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-12 rounded-xl" />
      ))}
    </div>
  )
}

function resolveInitialEventId(
  events: Array<{ id: number; is_current: boolean; is_next: boolean }>
): number | null {
  return (
    events.find((event) => event.is_current)?.id ??
    events.find((event) => event.is_next)?.id ??
    events[0]?.id ??
    null
  )
}

export function FixturesPage() {
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const { bootstrap, teamsById, isLoading: bootstrapLoading, error } =
    useFplBootstrap()
  const { teamsByCode } = useEnrichmentMaps()

  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(
    null
  )
  const [mobileFixture, setMobileFixture] = useState<FplFixture | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pollLive, setPollLive] = useState(false)

  const events = bootstrap?.events ?? []
  const teams = bootstrap?.teams ?? []

  useEffect(() => {
    if (selectedEventId != null || events.length === 0) {
      return
    }
    setSelectedEventId(resolveInitialEventId(events))
  }, [events, selectedEventId])

  const seasonFixturesQuery = useFplSeasonFixturesQuery({
    enabled: !!bootstrap,
    isLive: pollLive,
  })

  const fixtures = seasonFixturesQuery.data ?? []

  useEffect(() => {
    const hasLive = fixtures.some(
      (fixture) => getFixturePhase(fixture) === "live"
    )
    setPollLive(hasLive)
  }, [fixtures])

  const shapes = useMemo(
    () =>
      getGameweekShapes(
        events.map((event) => event.id),
        fixtures,
        teams
      ),
    [events, fixtures, teams]
  )

  const eventFixtures = useMemo(() => {
    if (selectedEventId == null) {
      return []
    }
    return getEventFixtures(fixtures, selectedEventId)
  }, [fixtures, selectedEventId])

  const dayGroups = useMemo(
    () => groupFixturesByDay(eventFixtures),
    [eventFixtures]
  )

  const selectedFixture = useMemo(() => {
    if (selectedFixtureId == null) {
      return null
    }
    return eventFixtures.find((fixture) => fixture.id === selectedFixtureId) ?? null
  }, [eventFixtures, selectedFixtureId])

  const selectedShape =
    selectedEventId != null ? shapes.get(selectedEventId) : undefined

  useEffect(() => {
    if (!isDesktop || eventFixtures.length === 0) {
      return
    }

    if (
      selectedFixtureId == null ||
      !eventFixtures.some((fixture) => fixture.id === selectedFixtureId)
    ) {
      setSelectedFixtureId(eventFixtures[0]?.id ?? null)
    }
  }, [eventFixtures, isDesktop, selectedFixtureId])

  const handleSelectFixture = useCallback(
    (fixture: FplFixture) => {
      if (isDesktop) {
        setSelectedFixtureId(fixture.id)
        return
      }

      setMobileFixture(fixture)
      setDrawerOpen(true)
    },
    [isDesktop]
  )

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setDrawerOpen(open)
    if (!open) {
      setMobileFixture(null)
    }
  }, [])

  const isLoading =
    bootstrapLoading ||
    (seasonFixturesQuery.isPending && fixtures.length === 0)

  const listHeader = (
    <DataTile.Header className="flex-col items-stretch gap-3 px-3 pb-2 pt-3 lg:px-4">
      <DataTile.Heading>
        <DataTile.Label style={{ viewTransitionName: "vt-fixtures-title" }}>
          Fixtures
        </DataTile.Label>
        <DataTile.Subtitle className="text-sm font-medium">
          {selectedEventId != null
            ? `Gameweek ${selectedEventId}`
            : "Browse the season"}
          {selectedShape?.isDouble ? " · Double" : ""}
          {selectedShape?.isBlank ? " · Blank" : ""}
        </DataTile.Subtitle>
      </DataTile.Heading>
      {events.length > 0 && selectedEventId != null ? (
        <GameweekPager
          events={events}
          selectedEventId={selectedEventId}
          shapes={shapes}
          onSelect={setSelectedEventId}
        />
      ) : null}
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
              <FixtureListSkeleton />
            ) : error ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">{error}</p>
            ) : dayGroups.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No fixtures scheduled for this gameweek.
              </p>
            ) : (
              <ScrollFade
                className="flex min-h-0 w-full min-w-0 flex-1"
                contentClassName="flex flex-col gap-4 content-start px-3 pb-4"
              >
                {dayGroups.map((group) => (
                  <section key={group.dateKey} className="flex flex-col gap-1.5">
                    <h3 className="px-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {group.label}
                    </h3>
                    <div className="flex flex-col gap-1">
                      {group.fixtures.map((fixture) => {
                        const homeTeam = teamsById.get(fixture.team_h)
                        const awayTeam = teamsById.get(fixture.team_a)

                        return (
                          <FixtureRow
                            key={fixture.id}
                            fixture={fixture}
                            homeTeam={homeTeam}
                            awayTeam={awayTeam}
                            homeBadgeUrl={
                              homeTeam?.code != null
                                ? teamsByCode.get(homeTeam.code)?.badgeUrl
                                : null
                            }
                            awayBadgeUrl={
                              awayTeam?.code != null
                                ? teamsByCode.get(awayTeam.code)?.badgeUrl
                                : null
                            }
                            isSelected={
                              isDesktop
                                ? selectedFixtureId === fixture.id
                                : mobileFixture?.id === fixture.id && drawerOpen
                            }
                            onSelect={handleSelectFixture}
                          />
                        )
                      })}
                    </div>
                  </section>
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
              <DataTile.Label>Match centre</DataTile.Label>
            </DataTile.Heading>
          </DataTile.Header>
          <DataTile.Content
            align="between"
            className="min-h-0 flex-1 overflow-hidden px-0 pt-0"
          >
            <MatchDetailPane
              fixture={selectedFixture}
              showOpenLink
              className="overflow-hidden"
            />
          </DataTile.Content>
        </DataTile>
      </div>

      {!isDesktop ? (
        <Drawer open={drawerOpen} onOpenChange={handleDrawerOpenChange}>
          <DrawerContent size="lg" align="full">
            <DrawerPanel
              title={
                mobileFixture
                  ? `${teamsById.get(mobileFixture.team_h)?.short_name ?? "Home"} v ${teamsById.get(mobileFixture.team_a)?.short_name ?? "Away"}`
                  : "Match centre"
              }
              bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <MatchDetailPane
                fixture={mobileFixture}
                showOpenLink
                className={cn(drawerChromeOffsetClassName, "overflow-hidden")}
              />
            </DrawerPanel>
          </DrawerContent>
        </Drawer>
      ) : null}
    </>
  )
}
