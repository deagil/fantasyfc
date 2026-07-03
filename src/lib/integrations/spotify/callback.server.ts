import "@tanstack/react-start/server-only"

import { resolveAppUrl, spotifyRedirectUri } from "@/lib/app-url"

const STATE_COOKIE = "spotify_oauth_state"
const VERIFIER_COOKIE = "spotify_oauth_verifier"
const ORIGIN_COOKIE = "spotify_oauth_origin"

export async function completeSpotifyConnect(code: string, state: string) {
  const { deleteCookie, getCookie } = await import("@tanstack/react-start/server")
  const { requireServerAuthUser } = await import("@/lib/auth/auth.server")
  const { saveConnection } = await import(
    "@/lib/integrations/connections-store.server"
  )
  const { spotifyProvider } = await import("@/lib/integrations/spotify/provider")

  const user = await requireServerAuthUser()

  const expectedState = getCookie(STATE_COOKIE)
  const codeVerifier = getCookie(VERIFIER_COOKIE)
  const appOrigin = resolveAppUrl(getCookie(ORIGIN_COOKIE) ?? undefined)

  deleteCookie(STATE_COOKIE, { path: "/" })
  deleteCookie(VERIFIER_COOKIE, { path: "/" })
  deleteCookie(ORIGIN_COOKIE, { path: "/" })

  if (!expectedState || !codeVerifier || state !== expectedState) {
    throw new Error("Spotify connect failed: state mismatch")
  }

  const tokens = await spotifyProvider.exchangeCode({
    code,
    codeVerifier,
    redirectUri: spotifyRedirectUri(appOrigin),
  })

  await saveConnection(user.id, spotifyProvider.id, tokens)
}
