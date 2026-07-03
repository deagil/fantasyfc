import { createFileRoute, redirect } from "@tanstack/react-router"

import { tabSearch } from "@/lib/nav-pages"

export const Route = createFileRoute("/spotify-callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
  }),
  loaderDeps: ({ search }) => ({ code: search.code, state: search.state }),
  loader: async ({ deps }) => {
    if (deps.code && deps.state) {
      try {
        const { handleSpotifyCallback } = await import(
          "@/lib/integrations/spotify/server"
        )
        await handleSpotifyCallback({
          data: { code: deps.code, state: deps.state },
        })
      } catch {
        // Fall through to the hub either way — nothing actionable for the
        // user to do here besides retry connecting from account settings.
      }
    }

    throw redirect({ to: "/", search: tabSearch("hub") })
  },
})
