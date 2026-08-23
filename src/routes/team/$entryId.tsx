import { createFileRoute, Link, notFound } from "@tanstack/react-router"

import { AppShell } from "@/components/app-shell"
import { DetailPageDesktopChrome } from "@/components/detail-page-chrome"
import { MobilePageHeader } from "@/components/mobile-page-header"
import { TeamPage } from "@/components/team-page"
import { FplBootstrapProvider } from "@/lib/fpl/bootstrap-context"
import { useFplEntryQuery } from "@/lib/fpl/hooks"
import { TeamProvider } from "@/lib/fpl/team-context"
import {
  contentContainerClassName,
  hubMainClassName,
  hubTileContainerClassName,
  mobileContentTopSpacerClassName,
} from "@/lib/layout"
import { tabSearch } from "@/lib/nav-pages"
import { cn } from "@/lib/utils"

type TeamSearch = {
  fromLeague?: number
}

export const Route = createFileRoute("/team/$entryId")({
  validateSearch: (search: Record<string, unknown>): TeamSearch => {
    const raw = search.fromLeague
    const fromLeague =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN
    return Number.isFinite(fromLeague) && fromLeague > 0 ? { fromLeague } : {}
  },
  component: TeamDetailRoute,
})

function TeamDetailRoute() {
  return (
    <TeamProvider>
      <FplBootstrapProvider>
        <TeamDetailPage />
      </FplBootstrapProvider>
    </TeamProvider>
  )
}

function TeamDetailPage() {
  const { entryId: entryIdParam } = Route.useParams()
  const { fromLeague } = Route.useSearch()
  const entryId = Number(entryIdParam)
  const entryQuery = useFplEntryQuery(
    Number.isFinite(entryId) && entryId > 0 ? entryId : null
  )
  const teamName = entryQuery.data?.name ?? "Team"

  if (!Number.isFinite(entryId) || entryId <= 0) {
    throw notFound()
  }

  const backLink =
    fromLeague != null ? (
      <Link
        to="/league/$leagueId"
        params={{ leagueId: String(fromLeague) }}
        aria-label="Back"
      />
    ) : (
      <Link to="/" search={tabSearch("hub")} aria-label="Back" />
    )

  return (
    <AppShell className="flex flex-col overflow-x-hidden lg:h-svh lg:overflow-y-hidden">
      <MobilePageHeader
        className="lg:hidden"
        title={teamName}
        titleStyle={{ viewTransitionName: "vt-team-title" }}
        backRender={backLink}
      />

      <main className={hubMainClassName}>
        <div
          className={cn(contentContainerClassName, hubTileContainerClassName)}
        >
          <DetailPageDesktopChrome
            title={teamName}
            titleStyle={{ viewTransitionName: "vt-team-title" }}
            backRender={backLink}
          />

          <div className={mobileContentTopSpacerClassName} aria-hidden />

          <TeamPage entryId={entryId} />
        </div>
      </main>
    </AppShell>
  )
}
