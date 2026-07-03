import "@tanstack/react-start/server-only"

import { resolveAppUrl, spotifyRedirectUri } from "@/lib/app-url"

const STATE_COOKIE = "spotify_oauth_state"
const VERIFIER_COOKIE = "spotify_oauth_verifier"
const ORIGIN_COOKIE = "spotify_oauth_origin"
const OAUTH_COOKIE_MAX_AGE = 600

function spotifyOAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: OAUTH_COOKIE_MAX_AGE,
    path: "/",
  }
}

/** Sets PKCE cookies and returns the Spotify authorize URL. */
export async function beginSpotifyConnect(preferredOrigin?: string): Promise<string> {
  const { setCookie } = await import("@tanstack/react-start/server")
  const { requireServerAuthUser } = await import("@/lib/auth/auth.server")
  const {
    generateCodeChallenge,
    generateCodeVerifier,
    generateState,
  } = await import("@/lib/integrations/spotify/pkce")
  const { spotifyProvider } = await import("@/lib/integrations/spotify/provider")

  await requireServerAuthUser()

  const appOrigin = resolveAppUrl(preferredOrigin)
  const cookieOptions = spotifyOAuthCookieOptions()

  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)

  setCookie(STATE_COOKIE, state, cookieOptions)
  setCookie(VERIFIER_COOKIE, codeVerifier, cookieOptions)
  setCookie(ORIGIN_COOKIE, appOrigin, cookieOptions)

  return spotifyProvider.authorizationUrl({
    state,
    codeChallenge,
    redirectUri: spotifyRedirectUri(appOrigin),
  })
}

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
