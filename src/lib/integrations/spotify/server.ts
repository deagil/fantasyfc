import { createServerFn } from "@tanstack/react-start"

import {
  HUB_PLAYLIST_FALLBACK_NAME,
  HUB_PLAYLIST_ID,
  HUB_PLAYLIST_URI,
} from "@/lib/integrations/spotify/playlist"

export const beginSpotifyConnectForRoute = createServerFn({ method: "GET" })
  .validator((data: { origin?: string }) => data ?? {})
  .handler(async ({ data }) => {
    const { beginSpotifyConnect } = await import(
      "@/lib/integrations/spotify/oauth.server"
    )
    return beginSpotifyConnect(data.origin)
  })

export const handleSpotifyCallback = createServerFn({ method: "POST" })
  .validator((data: { code: string; state: string }) => data)
  .handler(async ({ data }) => {
    const { completeSpotifyConnect } = await import(
      "@/lib/integrations/spotify/oauth.server"
    )
    await completeSpotifyConnect(data.code, data.state)
  })

/**
 * Returns a fresh access token for the Web Playback SDK's getOAuthToken
 * callback. Refresh tokens never leave the server.
 */
export const getSpotifyAccessToken = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireServerAuthUser } = await import("@/lib/auth/auth.server")
    const { getValidConnection } = await import(
      "@/lib/integrations/connections-store.server"
    )
    const { spotifyProvider } = await import("@/lib/integrations/spotify/provider")

    const user = await requireServerAuthUser()
    const connection = await getValidConnection(user.id, spotifyProvider.id)
    return connection?.accessToken ?? null
  }
)

export const getHubPlaylistPreview = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireServerAuthUser } = await import("@/lib/auth/auth.server")
    const { getValidConnection } = await import(
      "@/lib/integrations/connections-store.server"
    )
    const { spotifyProvider } = await import("@/lib/integrations/spotify/provider")

    const user = await requireServerAuthUser()
    const connection = await getValidConnection(user.id, spotifyProvider.id)
    if (!connection) {
      return null
    }

    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${HUB_PLAYLIST_ID}?fields=name,images`,
      { headers: { Authorization: `Bearer ${connection.accessToken}` } }
    )

    if (!response.ok) {
      return {
        name: HUB_PLAYLIST_FALLBACK_NAME,
        imageUrl: null as string | null,
      }
    }

    const playlist = (await response.json()) as {
      name?: string
      images?: Array<{ url: string }>
    }

    return {
      name: playlist.name ?? HUB_PLAYLIST_FALLBACK_NAME,
      imageUrl: playlist.images?.[0]?.url ?? null,
    }
  }
)

export const playSpotifyHubPlaylist = createServerFn({ method: "POST" })
  .validator((data: { deviceId: string }) => data)
  .handler(async ({ data }) => {
    const { requireServerAuthUser } = await import("@/lib/auth/auth.server")
    const { getValidConnection } = await import(
      "@/lib/integrations/connections-store.server"
    )
    const { spotifyProvider } = await import("@/lib/integrations/spotify/provider")

    const user = await requireServerAuthUser()
    const connection = await getValidConnection(user.id, spotifyProvider.id)
    if (!connection) {
      throw new Error("Spotify is not connected")
    }

    const headers = {
      Authorization: `Bearer ${connection.accessToken}`,
      "Content-Type": "application/json",
    }

    const playUrl = new URL("https://api.spotify.com/v1/me/player/play")
    playUrl.searchParams.set("device_id", data.deviceId)

    const response = await fetch(playUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        context_uri: HUB_PLAYLIST_URI,
        offset: { position: 0 },
      }),
    })

    if (response.ok || response.status === 204) {
      return { ok: true as const }
    }

    throw new Error(`Spotify play failed: ${response.status}`)
  })
