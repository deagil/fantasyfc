import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

function pathDepth(pathname: string): number {
  return pathname.split("/").filter(Boolean).length
}

function isDetailPushPath(pathname: string): boolean {
  return pathname.startsWith("/league/") || pathname.startsWith("/trophy/")
}

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
        const fromDepth = pathDepth(from)
        const toDepth = pathDepth(to)

        if (isDetailPushPath(from) || isDetailPushPath(to)) {
          if (toDepth > fromDepth) return ["league-push"]
          if (toDepth < fromDepth) return ["league-pop"]
          return false
        }

        if (toDepth > fromDepth) return ["push"]
        if (toDepth < fromDepth) return ["pop"]
        return false
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
