import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

function pathDepth(pathname: string): number {
  return pathname.split("/").filter(Boolean).length
}

function isScoutReportPath(pathname: string): boolean {
  return pathname.startsWith("/scouts/")
}

/**
 * Full-screen fade for pathname changes (league, scout, trophy, …).
 * Uses the proven `league-push` / `league-pop` view-transition types.
 * Search-only changes (e.g. `?tab=`) stay instant — the hub carousel owns those.
 * Scout ↔ scout preset switches stay instant (same report shell, just a filter).
 */
export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultViewTransition: {
      types: ({ fromLocation, toLocation }) => {
        if (!fromLocation) return false

        const from = fromLocation.pathname
        const to = toLocation.pathname
        // Same path → search/hash only (hub tabs). Skip VT.
        if (from === to) return false

        // Scout preset tabs share one report shell — don't full-fade between them.
        if (isScoutReportPath(from) && isScoutReportPath(to)) return false

        const fromDepth = pathDepth(from)
        const toDepth = pathDepth(to)

        if (toDepth < fromDepth) return ["league-pop"]
        return ["league-push"]
      },
    },
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
