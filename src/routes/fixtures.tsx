import { ChevronLeftIcon } from "lucide-react"
import { createFileRoute, Link } from "@tanstack/react-router"

import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { contentContainerClassName } from "@/lib/layout"
import { tabSearch } from "@/lib/nav-pages"

export const Route = createFileRoute("/fixtures")({
  component: FixturesDetailPage,
})

function FixturesDetailPage() {
  return (
    <AppShell>
      <header className={contentContainerClassName}>
        <div className="flex h-14 items-center gap-1 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Button
            variant="ghost"
            size="icon-sm"
            className="shell-chrome-ghost -ml-1 shrink-0 rounded-full"
            render={<Link to="/" search={tabSearch("central")} aria-label="Back" />}
          >
            <ChevronLeftIcon />
          </Button>
          <h1
            className="truncate font-heading text-xl font-semibold tracking-tight text-(--shell-foreground)"
            style={{ viewTransitionName: "vt-fixtures-title" }}
          >
            Fixtures
          </h1>
        </div>
      </header>

      <main className={contentContainerClassName}>
        <p className="py-12 text-center text-sm text-(--shell-muted)">
          Fixture detail view — coming soon.
        </p>
      </main>
    </AppShell>
  )
}
