import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

function pathDepth(pathname: string): number {
  return pathname.split("/").filter(Boolean).length
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
        const fromDepth = pathDepth(fromLocation.pathname)
        const toDepth = pathDepth(toLocation.pathname)
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
