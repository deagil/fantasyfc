import { createFileRoute, useSearch } from "@tanstack/react-router"

import { AppShell } from "@/components/app-shell"
import { MobilePageHeader } from "@/components/mobile-page-header"
import { NavTabs } from "@/components/nav-tabs"
import { PageCarousel } from "@/components/page-carousel"
import { UserMenu } from "@/components/user-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import { contentContainerClassName, hubDesktopAlignClassName, hubTileContainerClassName } from "@/lib/layout"
import { FplBootstrapProvider } from "@/lib/fpl/bootstrap-context"
import { TeamProvider } from "@/lib/fpl/team-context"
import { navPages, validateHubSearch } from "@/lib/nav-pages"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_app")({
  validateSearch: validateHubSearch,
  component: AppLayout,
})

function AppLayout() {
  const { tab } = useSearch({ from: "/_app" })
  const activePage = navPages.find((page) => page.id === tab) ?? navPages[0]

  return (
    <TeamProvider>
      <FplBootstrapProvider>
        <TooltipProvider>
          <AppShell className="flex flex-col overflow-x-hidden lg:h-svh lg:overflow-y-hidden">
              <MobilePageHeader title={activePage.label} />

              <main
                className={cn(
                  "flex min-h-0 flex-col",
                  "pb-28 lg:flex-1 lg:justify-start lg:pt-4 lg:pb-3"
                )}
              >
                <div className={cn(contentContainerClassName, hubTileContainerClassName)}>
                  <div
                    className={cn(
                      "hidden items-center gap-4 lg:flex",
                      hubDesktopAlignClassName
                    )}
                  >
                    <NavTabs className="min-w-0 flex-1" />
                    <UserMenu />
                  </div>
                </div>
                <PageCarousel className="lg:mt-2" />
              </main>

              <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-2 lg:hidden">
                <div className="w-full max-w-lg">
                  <NavTabs variant="default" />
                </div>
              </nav>
            </AppShell>
        </TooltipProvider>
      </FplBootstrapProvider>
    </TeamProvider>
  )
}
