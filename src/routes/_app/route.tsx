import { createFileRoute } from "@tanstack/react-router"

import { NavTabs } from "@/components/nav-tabs"
import { PageCarousel } from "@/components/page-carousel"
import { contentContainerClassName } from "@/lib/layout"
import { validateHubSearch } from "@/lib/nav-pages"

export const Route = createFileRoute("/_app")({
  validateSearch: validateHubSearch,
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-x-hidden">
      <main className="flex flex-1 flex-col py-6 pb-28 lg:justify-start lg:pt-20 lg:pb-12">
        <div className={contentContainerClassName}>
          <NavTabs className="hidden lg:block" />
        </div>
        <PageCarousel className="mt-4" />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="w-full max-w-lg">
          <NavTabs variant="default" />
        </div>
      </nav>
    </div>
  )
}
