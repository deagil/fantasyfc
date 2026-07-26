import { Link } from "@tanstack/react-router"
import { useCallback, useMemo, useState } from "react"

import { DataTile } from "@/components/data-tile"
import { FixtureRow } from "@/components/fixture-row"
import { MatchDetailPane } from "@/components/match-detail-pane"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Drawer,
  DrawerContent,
  DrawerPanel,
  drawerChromeOffsetClassName,
} from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useEnrichmentMaps } from "@/lib/enrichment/hooks"
import { getFixturePhase } from "@/lib/fixtures/form"
import {
  groupFixturesByDay,
  sortFixturesByKickoff,
} from "@/lib/fixtures/group"
import type { FixtureDayGroup } from "@/lib/fixtures/group"
import { useFplBootstrap } from "@/lib/fpl/bootstrap-context"
import type { FplFixture } from "@/lib/fpl/types"
import { tabSearch } from "@/lib/nav-pages"
import { cn } from "@/lib/utils"

function MatchdaySkeleton() {
  return (
    <div className="flex w-full flex-col gap-2">
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  )
}

function takeFixturesPreservingDays(
  fixtures: readonly FplFixture[],
  limit: number
): FixtureDayGroup[] {
  return groupFixturesByDay(fixtures.slice(0, limit), undefined, "short")
}

export function MatchdayTile({
  className,
  comingSoon = false,
}: {
  className?: string
  comingSoon?: boolean
}) {
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const { fixtures, teamsById, isLoading, error } = useFplBootstrap()
  const { teamsByCode } = useEnrichmentMaps()
  const [selectedFixture, setSelectedFixture] = useState<FplFixture | null>(
    null
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { title, dayGroups } = useMemo(() => {
    const live = sortFixturesByKickoff(
      fixtures.filter((fixture) => getFixturePhase(fixture) === "live")
    )
    if (live.length > 0) {
      return {
        title: "Live scores",
        dayGroups: takeFixturesPreservingDays(live, 3),
      }
    }

    const now = Date.now()
    const upcoming = sortFixturesByKickoff(
      fixtures.filter((fixture) => {
        if (getFixturePhase(fixture) !== "pre-match" || !fixture.kickoff_time) {
          return false
        }
        return new Date(fixture.kickoff_time).getTime() >= now
      })
    )

    if (upcoming.length > 0) {
      return {
        title: "Next fixtures",
        dayGroups: takeFixturesPreservingDays(upcoming, 3),
      }
    }

    const finished = sortFixturesByKickoff(
      fixtures.filter((fixture) => getFixturePhase(fixture) === "finished")
    )
      .slice(-3)
      .reverse()

    return {
      title: "Results",
      dayGroups: takeFixturesPreservingDays(finished, 3),
    }
  }, [fixtures])

  const hasRows = dayGroups.some((group) => group.fixtures.length > 0)

  const stopCarouselPointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.stopPropagation()
    },
    []
  )

  const handleSelectFixture = useCallback((fixture: FplFixture) => {
    setSelectedFixture(fixture)
    setDrawerOpen(true)
  }, [])

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
        interactive
        comingSoon={comingSoon}
        className={cn("relative h-full", className)}
      >
        <div
          className="flex h-full min-h-0 flex-col"
          onPointerDown={stopCarouselPointer}
          onPointerUp={stopCarouselPointer}
        >
          <DataTile.Header className="p-3 pb-0">
            <DataTile.Heading>
              <Link
                to="/"
                search={tabSearch("fixtures")}
                data-tile-link=""
                className="truncate text-base font-semibold text-foreground outline-none hover:underline focus-visible:underline lg:text-lg"
              >
                {title}
              </Link>
            </DataTile.Heading>
          </DataTile.Header>

          <DataTile.Content
            align="between"
            className="min-h-0 flex-1 gap-1 overflow-hidden p-2 pt-2"
          >
            {isLoading && fixtures.length === 0 ? (
              <MatchdaySkeleton />
            ) : error && fixtures.length === 0 ? (
              <DataTile.EmptyState className="text-destructive">
                {error}
              </DataTile.EmptyState>
            ) : !hasRows ? (
              <DataTile.EmptyState className="text-center">
                No fixtures to show.
              </DataTile.EmptyState>
            ) : (
              <div className="flex w-full flex-col gap-1.5 overflow-hidden">
                {dayGroups.map((group) => (
                  <section key={group.dateKey} className="flex flex-col gap-0.5">
                    <h3 className="px-1 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {group.label}
                    </h3>
                    <div className="flex flex-col gap-0.5">
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
                            compact
                            isSelected={
                              drawerOpen && selectedFixture?.id === fixture.id
                            }
                            onSelect={handleSelectFixture}
                          />
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
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
            bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <MatchDetailPane
              fixture={selectedFixture}
              showOpenLink
              className={cn(drawerChromeOffsetClassName, "overflow-hidden")}
            />
          </DrawerPanel>
        </DrawerContent>
      </Drawer>
    </>
  )
}
