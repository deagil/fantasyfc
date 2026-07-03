import { createFileRoute, redirect } from "@tanstack/react-router"

import { tabSearch } from "@/lib/nav-pages"

export const Route = createFileRoute("/spotify-callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  loaderDeps: ({ search }) => ({
    code: search.code,
    state: search.state,
    error: search.error,
  }),
  loader: async ({ deps }) => {
    if (deps.error) {
      throw redirect({
        to: "/",
        search: { ...tabSearch("hub"), spotify_error: deps.error },
      })
    }

    if (deps.code && deps.state) {
      try {
        const { handleSpotifyCallback } = await import(
          "@/lib/integrations/spotify/server"
        )
        await handleSpotifyCallback({
          data: { code: deps.code, state: deps.state },
        })
      } catch {
        throw redirect({
          to: "/",
          search: { ...tabSearch("hub"), spotify_error: "callback_failed" },
        })
      }
    }

    throw redirect({ to: "/", search: tabSearch("hub") })
  },
})
