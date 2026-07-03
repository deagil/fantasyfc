import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router"

import { tabSearch } from "@/lib/nav-pages"

export const Route = createFileRoute("/spotify-connect")({
  validateSearch: (search: Record<string, unknown>) => ({
    origin: typeof search.origin === "string" ? search.origin : undefined,
  }),
  loaderDeps: ({ search }) => ({ origin: search.origin }),
  loader: async ({ deps }) => {
    try {
      const { beginSpotifyConnectForRoute } = await import(
        "@/lib/integrations/spotify/server"
      )
      const url = await beginSpotifyConnectForRoute({
        data: { origin: deps.origin },
      })
      throw redirect({ href: url })
    } catch (error) {
      if (isRedirect(error)) {
        throw error
      }

      throw redirect({ to: "/", search: tabSearch("hub") })
    }
  },
})
