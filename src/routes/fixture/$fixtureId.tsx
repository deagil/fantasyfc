import {
  createFileRoute,
  Link,
  notFound,
} from "@tanstack/react-router"
import { useMemo } from "react"

import { AppShell } from "@/components/app-shell"
import { DetailPageDesktopChrome } from "@/components/detail-page-chrome"
import { MatchDetailPane } from "@/components/match-detail-pane"
import { MobilePageHeader } from "@/components/mobile-page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { FplBootstrapProvider, useFplBootstrap } from "@/lib/fpl/bootstrap-context"
import { useFplSeasonFixturesQuery } from "@/lib/fpl/hooks"
import { TeamProvider } from "@/lib/fpl/team-context"
import {
  contentContainerClassName,
  hubMainClassName,
  hubTileContainerClassName,
  mobileContentTopSpacerClassName,
} from "@/lib/layout"
import { tabSearch } from "@/lib/nav-pages"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/fixture/$fixtureId")({
  component: FixtureDetailRoute,
})

function FixtureDetailRoute() {
  return (
    <TeamProvider>
      <FplBootstrapProvider>
        <FixtureDetailPage />
      </FplBootstrapProvider>
    </TeamProvider>
  )
}

function FixtureDetailPage() {
  const { fixtureId: fixtureIdParam } = Route.useParams()
  const fixtureId = Number(fixtureIdParam)
  const { teamsById, isLoading: bootstrapLoading } = useFplBootstrap()
  const fixturesQuery = useFplSeasonFixturesQuery()

  const fixture = useMemo(() => {
    if (!Number.isFinite(fixtureId)) {
      return null
    }
    return (
      fixturesQuery.data?.find((entry) => entry.id === fixtureId) ?? null
    )
  }, [fixtureId, fixturesQuery.data])

  if (!Number.isFinite(fixtureId) || fixtureId <= 0) {
    throw notFound()
  }

  if (!fixturesQuery.isPending && fixturesQuery.data && !fixture) {
    throw notFound()
  }

  const homeShort = fixture
    ? (teamsById.get(fixture.team_h)?.short_name ?? "Home")
    : "Match"
  const awayShort = fixture
    ? (teamsById.get(fixture.team_a)?.short_name ?? "Away")
    : ""
  const title = fixture ? `${homeShort} v ${awayShort}` : "Match"

  const backLink = (
    <Link to="/" search={tabSearch("fixtures")} aria-label="Back" />
  )

  return (
    <AppShell className="flex flex-col overflow-x-hidden lg:h-svh lg:overflow-y-hidden">
      <MobilePageHeader
        className="lg:hidden"
        title={title}
        titleStyle={{ viewTransitionName: "vt-fixtures-title" }}
        backRender={backLink}
      />

      <main className={hubMainClassName}>
        <div className={cn(contentContainerClassName, hubTileContainerClassName)}>
          <DetailPageDesktopChrome
            title={title}
            titleStyle={{ viewTransitionName: "vt-fixtures-title" }}
            backRender={backLink}
          />

          <div className={mobileContentTopSpacerClassName} aria-hidden />

          {bootstrapLoading || (fixturesQuery.isPending && !fixture) ? (
            <div className="flex flex-col gap-3 py-4">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          ) : fixturesQuery.isError ? (
            <p className="py-12 text-center text-sm text-destructive">
              Could not load this fixture.
            </p>
          ) : (
            <div className="min-h-0 overflow-hidden rounded-2xl bg-(--tile-bg) lg:rounded-[2px]">
              <MatchDetailPane fixture={fixture} className="min-h-[70dvh]" />
            </div>
          )}
        </div>
      </main>
    </AppShell>
  )
}
