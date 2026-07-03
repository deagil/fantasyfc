import "@tanstack/react-start/server-only"

import { resolveAppUrl, spotifyRedirectUri } from "@/lib/app-url"

/** Sets pending OAuth state server-side and returns the Spotify authorize URL. */
export async function beginSpotifyConnect(preferredOrigin?: string): Promise<string> {
  const { requireServerAuthUser } = await import("@/lib/auth/auth.server")
  const {
    generateCodeChallenge,
    generateCodeVerifier,
    generateState,
  } = await import("@/lib/integrations/spotify/pkce")
  const { saveSpotifyOAuthPending } = await import(
    "@/lib/integrations/spotify/oauth-pending-store.server"
  )
  const { spotifyProvider } = await import("@/lib/integrations/spotify/provider")

  const user = await requireServerAuthUser()

  const appOrigin = resolveAppUrl(preferredOrigin)

  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)

  await saveSpotifyOAuthPending(user.id, {
    state,
    codeVerifier,
    appOrigin,
  })

  return spotifyProvider.authorizationUrl({
    state,
    codeChallenge,
    redirectUri: spotifyRedirectUri(appOrigin),
  })
}

export async function completeSpotifyConnect(code: string, state: string) {
  const { requireServerAuthUser } = await import("@/lib/auth/auth.server")
  const { saveConnection } = await import(
    "@/lib/integrations/connections-store.server"
  )
  const { consumeSpotifyOAuthPending } = await import(
    "@/lib/integrations/spotify/oauth-pending-store.server"
  )
  const { spotifyProvider } = await import("@/lib/integrations/spotify/provider")

  const user = await requireServerAuthUser()

  const pending = await consumeSpotifyOAuthPending(user.id, state)
  if (!pending) {
    throw new Error("Spotify connect failed: state mismatch or expired")
  }

  const tokens = await spotifyProvider.exchangeCode({
    code,
    codeVerifier: pending.codeVerifier,
    redirectUri: spotifyRedirectUri(pending.appOrigin),
  })

  await saveConnection(user.id, spotifyProvider.id, tokens)
}
