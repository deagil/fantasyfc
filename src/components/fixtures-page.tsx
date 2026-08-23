import { useCallback, useEffect, useMemo, useState } from "react"

import { DataTile } from "@/components/data-tile"
import { FixtureRow } from "@/components/fixture-row"
import { GameweekPager } from "@/components/gameweek-pager"
import { MatchDetailPane, MatchOpenPageButton } from "@/components/match-detail-pane"
import { ScrollFade } from "@/components/scroll-fade"
import {
  Drawer,
  DrawerContent,
  DrawerPanel,
  drawerMatchChromeOffsetClassName,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useEnrichmentMaps } from "@/lib/enrichment/hooks"
import { getEventFixtures, groupFixturesByDay } from "@/lib/fixtures/group"
import { getGameweekShapes } from "@/lib/fixtures/gameweek-shape"
import { getFixturePhase } from "@/lib/fixtures/form"
import { formatMatchSheetTitle } from "@/lib/fixtures/kickoff"
import { useFplBootstrap } from "@/lib/fpl/bootstrap-context"
import { useFplSeasonFixturesQuery } from "@/lib/fpl/hooks"
import type { FplFixture } from "@/lib/fpl/types"
import { hubMasterDetailGridClassName } from "@/lib/layout"
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

  function renderFixtureListBody() {
    if (isLoading) {
      return <FixtureListSkeleton />
    }
    if (error) {
      return <p className="px-4 py-6 text-sm text-muted-foreground">{error}</p>
    }
    if (dayGroups.length === 0) {
      return (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No fixtures scheduled for this gameweek.
        </p>
      )
    }

    return dayGroups.map((group) => (
      <section key={group.dateKey} className="flex flex-col gap-1.5">
        <h3 className="px-1 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
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
    ))
  }

  return (
    <>
      <div className={hubMasterDetailGridClassName}>
        <DataTile
          interactive
          className="max-lg:h-auto lg:col-span-2 lg:row-span-3 lg:col-start-1 lg:row-start-1"
        >
          {listHeader}
          <DataTile.Content
            align="between"
            className="gap-2 px-0 pt-0 max-lg:flex-none lg:min-h-0 lg:flex-1 lg:overflow-hidden"
          >
            {/* Mobile: hug the fixture list; page scroll handles overflow. */}
            <div className="flex flex-col gap-4 content-start px-3 pb-4 lg:hidden">
              {renderFixtureListBody()}
            </div>
            {/* Desktop: fill the hub cell and scroll inside the tile. */}
            <ScrollFade
              className="hidden min-h-0 w-full min-w-0 flex-1 lg:flex"
              contentClassName="flex flex-col gap-4 content-start px-3 pb-4"
            >
              {renderFixtureListBody()}
            </ScrollFade>
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
                  ? formatMatchSheetTitle(mobileFixture)
                  : "Match centre"
              }
              leading={
                mobileFixture ? (
                  <MatchOpenPageButton fixtureId={mobileFixture.id} />
                ) : undefined
              }
              bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <MatchDetailPane
                fixture={mobileFixture}
                sheetChrome
                className={cn(drawerMatchChromeOffsetClassName, "overflow-hidden")}
              />
            </DrawerPanel>
          </DrawerContent>
        </Drawer>
      ) : null}
    </>
  )
}
