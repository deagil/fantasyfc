import { Link } from "@tanstack/react-router"
import { useMemo } from "react"

import { DataTile } from "@/components/data-tile"
import { FixtureRow } from "@/components/fixture-row"
import { Skeleton } from "@/components/ui/skeleton"
import { useEnrichmentMaps } from "@/lib/enrichment/hooks"
import { getFixturePhase } from "@/lib/fixtures/form"
import { sortFixturesByKickoff } from "@/lib/fixtures/group"
import { useFplBootstrap } from "@/lib/fpl/bootstrap-context"
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

export function MatchdayTile({
  className,
  comingSoon = false,
}: {
  className?: string
  comingSoon?: boolean
}) {
  const { fixtures, teamsById, isLoading, error } = useFplBootstrap()
  const { teamsByCode } = useEnrichmentMaps()

  const { title, subtitle, rows } = useMemo(() => {
    const live = sortFixturesByKickoff(
      fixtures.filter((fixture) => getFixturePhase(fixture) === "live")
    )
    if (live.length > 0) {
      return {
        title: "Live scores",
        subtitle: `${live.length} live now`,
        rows: live.slice(0, 3),
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
    ).slice(0, 3)

    if (upcoming.length > 0) {
      return {
        title: "Next fixtures",
        subtitle: "Upcoming kickoffs",
        rows: upcoming,
      }
    }

    const finished = sortFixturesByKickoff(
      fixtures.filter((fixture) => getFixturePhase(fixture) === "finished")
    )
      .slice(-3)
      .reverse()

    return {
      title: "Results",
      subtitle: finished.length > 0 ? "Latest scores" : "No fixtures yet",
      rows: finished,
    }
  }, [fixtures])

  return (
    <Link
      to="/"
      search={tabSearch("fixtures")}
      data-tile-link=""
      className={cn(className)}
    >
      <DataTile interactive comingSoon={comingSoon} className="relative h-full">
        <div className="flex h-full min-h-0 flex-col">
          <DataTile.Header className="p-3 pb-0">
            <DataTile.Heading>
              <DataTile.Label>{title}</DataTile.Label>
              <DataTile.Subtitle>{subtitle}</DataTile.Subtitle>
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
            ) : rows.length === 0 ? (
              <DataTile.EmptyState className="text-center">
                No fixtures to show.
              </DataTile.EmptyState>
            ) : (
              <div className="flex w-full flex-col gap-0.5">
                {rows.map((fixture) => {
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
                    />
                  )
                })}
              </div>
            )}
          </DataTile.Content>
        </div>
      </DataTile>
    </Link>
  )
}
