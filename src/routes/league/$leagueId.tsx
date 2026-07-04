import { ChevronLeftIcon } from "lucide-react"
import { createFileRoute, Link, notFound } from "@tanstack/react-router"

import { AppShell } from "@/components/app-shell"
import { DataTile } from "@/components/data-tile"
import { LeagueStandingsList } from "@/components/league-standings-list"
import { Button } from "@/components/ui/button"
import { useFplStandingsQuery } from "@/lib/fpl/hooks"
import { TeamProvider, useTeam } from "@/lib/fpl/team-context"
import {
  contentContainerClassName,
  hubTileContainerClassName,
  hubTileGridClassName,
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

  return (
    <AppShell className="flex flex-col lg:h-svh lg:overflow-y-hidden">
      <header className={contentContainerClassName}>
        <div className="flex h-14 items-center gap-1 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Button
            variant="ghost"
            size="icon-sm"
            className="shell-chrome-ghost -ml-1 shrink-0 rounded-full"
            render={<Link to="/" search={tabSearch("hub")} aria-label="Back" />}
          >
            <ChevronLeftIcon />
          </Button>
          <h1
            className="truncate font-heading text-xl font-semibold tracking-tight text-(--shell-foreground)"
            style={{ viewTransitionName: "vt-league-title" }}
          >
            {leagueName}
          </h1>
        </div>
      </header>

      <main
        className={cn(
          contentContainerClassName,
          hubTileContainerClassName,
          "flex min-h-0 flex-1 flex-col pb-28 lg:pb-3 lg:pt-2"
        )}
      >
        <div className={hubTileGridClassName}>
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
          />
        </div>
      </main>
    </AppShell>
  )
}
