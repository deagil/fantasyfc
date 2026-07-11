import { createFileRoute, Link, notFound } from "@tanstack/react-router"

import { AppShell } from "@/components/app-shell"
import { DetailPageDesktopChrome } from "@/components/detail-page-chrome"
import { MobilePageHeader } from "@/components/mobile-page-header"
import { ScoutReportPage } from "@/components/scout-report-page"
import { FplBootstrapProvider } from "@/lib/fpl/bootstrap-context"
import { TeamProvider } from "@/lib/fpl/team-context"
import {
  contentContainerClassName,
  hubMainClassName,
  hubTileContainerClassName,
  mobileContentTopSpacerClassName,
} from "@/lib/layout"
import { tabSearch } from "@/lib/nav-pages"
import { getScoutPreset } from "@/lib/scouts/presets"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/scouts/$scoutSlug")({
  beforeLoad: ({ params }) => {
    const scout = getScoutPreset(params.scoutSlug)

    if (!scout) {
      throw notFound()
    }
  },
  component: ScoutDetailRoute,
})

function ScoutDetailRoute() {
  return (
    <TeamProvider>
      <FplBootstrapProvider>
        <ScoutDetailPage />
      </FplBootstrapProvider>
    </TeamProvider>
  )
}

function ScoutDetailPage() {
  const { scoutSlug } = Route.useParams()
  const scout = getScoutPreset(scoutSlug)

  if (!scout) {
    throw notFound()
  }

  const backLink = (
    <Link to="/" search={tabSearch("transfers")} aria-label="Back" />
  )

  return (
    <AppShell className="flex flex-col overflow-x-hidden lg:h-svh lg:overflow-y-hidden">
      <MobilePageHeader
        className="lg:hidden"
        title={scout.name}
        titleStyle={{ viewTransitionName: "vt-scouts-title" }}
        backRender={backLink}
      />

      <main className={hubMainClassName}>
        <div className={cn(contentContainerClassName, hubTileContainerClassName)}>
          <DetailPageDesktopChrome
            title={scout.name}
            titleStyle={{ viewTransitionName: "vt-scouts-title" }}
            backRender={backLink}
          />

          <div className={mobileContentTopSpacerClassName} aria-hidden />

          <ScoutReportPage
            scout={scout}
            titleStyle={{ viewTransitionName: "vt-scouts-title" }}
          />
        </div>
      </main>
    </AppShell>
  )
}
