import { createServerFn } from "@tanstack/react-start"

import {
  HUB_PLAYLIST_FALLBACK_NAME,
  HUB_PLAYLIST_ID,
  HUB_PLAYLIST_URI,
} from "@/lib/integrations/spotify/playlist"

const STATE_COOKIE = "spotify_oauth_state"
const VERIFIER_COOKIE = "spotify_oauth_verifier"
const OAUTH_COOKIE_MAX_AGE = 600

function redirectUri() {
  const appUrl = process.env.APP_URL ?? "http://127.0.0.1:3000"
  return `${appUrl}/spotify-callback`
}

export const startSpotifyConnect = createServerFn({ method: "POST" }).handler(
  async () => {
    const { setCookie } = await import("@tanstack/react-start/server")
    const { requireServerAuthUser } = await import("@/lib/auth/auth.server")
    const {
      generateCodeChallenge,
      generateCodeVerifier,
      generateState,
    } = await import("@/lib/integrations/spotify/pkce")
    const { spotifyProvider } = await import("@/lib/integrations/spotify/provider")

    await requireServerAuthUser()

    const state = generateState()
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)

    setCookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: OAUTH_COOKIE_MAX_AGE,
      path: "/",
    })
    setCookie(VERIFIER_COOKIE, codeVerifier, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: OAUTH_COOKIE_MAX_AGE,
      path: "/",
    })

    return {
      url: spotifyProvider.authorizationUrl({
        state,
        codeChallenge,
        redirectUri: redirectUri(),
      }),
    }
  }
)

export const handleSpotifyCallback = createServerFn({ method: "POST" })
  .validator((data: { code: string; state: string }) => data)
  .handler(async ({ data }) => {
    const { deleteCookie, getCookie } = await import("@tanstack/react-start/server")
    const { requireServerAuthUser } = await import("@/lib/auth/auth.server")
    const { saveConnection } = await import(
      "@/lib/integrations/connections-store.server"
    )
    const { spotifyProvider } = await import("@/lib/integrations/spotify/provider")

    const user = await requireServerAuthUser()

    const expectedState = getCookie(STATE_COOKIE)
    const codeVerifier = getCookie(VERIFIER_COOKIE)
    deleteCookie(STATE_COOKIE, { path: "/" })
    deleteCookie(VERIFIER_COOKIE, { path: "/" })

    if (!expectedState || !codeVerifier || data.state !== expectedState) {
      throw new Error("Spotify connect failed: state mismatch")
    }

    const tokens = await spotifyProvider.exchangeCode({
      code: data.code,
      codeVerifier,
      redirectUri: redirectUri(),
    })

    await saveConnection(user.id, spotifyProvider.id, tokens)
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

    const data = (await response.json()) as {
      name?: string
      images?: Array<{ url: string }>
    }

    return {
      name: data.name ?? HUB_PLAYLIST_FALLBACK_NAME,
      imageUrl: data.images?.[0]?.url ?? null,
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
