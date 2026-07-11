import { createFileRoute, Link, notFound } from "@tanstack/react-router"

import { AppShell } from "@/components/app-shell"
import {
  DetailPageDesktopChrome,
} from "@/components/detail-page-chrome"
import { MobilePageHeader } from "@/components/mobile-page-header"
import { DataTile } from "@/components/data-tile"
import { LeaguePositionChart } from "@/components/league-position-chart"
import { LeagueStandingsList } from "@/components/league-standings-list"
import {
  useFplLeagueRankHistoryQuery,
  useFplStandingsQuery,
} from "@/lib/fpl/hooks"
import { LEAGUE_RANK_HISTORY_WEEKS } from "@/lib/fpl/league-rank-history"
import { TeamProvider, useTeam } from "@/lib/fpl/team-context"
import {
  contentContainerClassName,
  hubMainClassName,
  hubTileContainerClassName,
  hubTileGridClassName,
  mobileContentTopSpacerClassName,
} from "@/lib/layout"
import { tabSearch } from "@/lib/nav-pages"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/league/$leagueId")({
  beforeLoad: ({ params }) => {
    const leagueId = Number(params.leagueId)

    if (!Number.isFinite(leagueId) || leagueId <= 0) {
      throw notFound()
    }
  },
  component: LeagueDetailRoute,
})

function LeagueDetailRoute() {
  return (
    <TeamProvider>
      <LeagueDetailPage />
    </TeamProvider>
  )
}

function LeagueDetailPage() {
  const { leagueId: leagueIdParam } = Route.useParams()
  const leagueId = Number(leagueIdParam)
  const { teamId } = useTeam()

  const standingsQuery = useFplStandingsQuery(leagueId)
  const standings = standingsQuery.data?.standings.results ?? []
  const leagueName = standingsQuery.data?.league.name ?? "League"
  const standingsLoading = standingsQuery.isPending && standings.length === 0
  const standingsError = standingsQuery.error ? "Could not load standings." : null

  const rankHistoryQuery = useFplLeagueRankHistoryQuery(leagueId, {
    currentTeamId: teamId,
    weeks: LEAGUE_RANK_HISTORY_WEEKS,
  })
  const rankHistory = rankHistoryQuery.data
  const rankHistoryLoading =
    rankHistoryQuery.isPending && rankHistory === undefined
  const rankHistoryError = rankHistoryQuery.error
    ? "Could not load position history."
    : null

  const backLink = (
    <Link to="/" search={tabSearch("hub")} aria-label="Back" />
  )

  return (
    <AppShell className="flex flex-col overflow-x-hidden lg:h-svh lg:overflow-y-hidden">
      <MobilePageHeader
        className="lg:hidden"
        title={leagueName}
        backRender={backLink}
      />

      <main className={hubMainClassName}>
        {/* Same chrome → content stack as hub `_app` nav + tiles */}
        <div className={cn(contentContainerClassName, hubTileContainerClassName)}>
          <DetailPageDesktopChrome
            title={leagueName}
            backRender={backLink}
          />

          <div className={mobileContentTopSpacerClassName} aria-hidden />

          <div className={cn(hubTileGridClassName, "lg:mt-2")}>
            <DataTile
              className="col-span-2 row-span-3 lg:col-start-1 lg:row-start-1"
            >
              <DataTile.Header className="pb-2 pt-3">
                <DataTile.Heading>
                  <DataTile.Label>{leagueName}</DataTile.Label>
                </DataTile.Heading>
              </DataTile.Header>
              <DataTile.Content
                align="between"
                className="min-h-0 flex-1 gap-2 overflow-hidden px-0 pt-0"
              >
                <LeagueStandingsList
                  standings={standings}
                  currentTeamId={teamId}
                  isLoading={standingsLoading}
                  error={standingsError}
                  contentClassName="pb-4"
                />
              </DataTile.Content>
            </DataTile>

            <DataTile
              size="2x1"
              className="col-span-2 row-span-1 lg:col-start-3 lg:row-start-1"
            />

            <DataTile
              size="2x2"
              className="col-span-2 row-span-2 lg:col-start-3 lg:row-start-2"
            >
              <DataTile.Header className="pb-0 pt-3">
                <DataTile.Heading>
                  <DataTile.Label>Position race</DataTile.Label>
                </DataTile.Heading>
              </DataTile.Header>
              <DataTile.Content
                align="between"
                className="flex min-h-0 flex-1 flex-col overflow-hidden px-0 pt-0"
              >
                <LeaguePositionChart
                  history={rankHistory}
                  weeks={LEAGUE_RANK_HISTORY_WEEKS}
                  isLoading={rankHistoryLoading}
                  error={rankHistoryError}
                />
              </DataTile.Content>
            </DataTile>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
