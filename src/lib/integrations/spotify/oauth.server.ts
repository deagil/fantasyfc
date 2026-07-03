import "@tanstack/react-start/server-only"

import { resolveAppUrl, spotifyRedirectUri } from "@/lib/app-url"

/** Sets pending OAuth state server-side and returns the Spotify authorize URL. */
export async function beginSpotifyConnect(preferredOrigin?: string): Promise<string> {
  const [
    { requireServerAuthUser },
    { generateCodeChallenge, generateCodeVerifier, generateState },
    { saveSpotifyOAuthPending },
    { spotifyProvider },
  ] = await Promise.all([
    import("@/lib/auth/auth.server"),
    import("@/lib/integrations/spotify/pkce"),
    import("@/lib/integrations/spotify/oauth-pending-store.server"),
    import("@/lib/integrations/spotify/provider"),
  ])

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
  const [
    { requireServerAuthUser },
    { saveConnection },
    { consumeSpotifyOAuthPending },
    { spotifyProvider },
  ] = await Promise.all([
    import("@/lib/auth/auth.server"),
    import("@/lib/integrations/connections-store.server"),
    import("@/lib/integrations/spotify/oauth-pending-store.server"),
    import("@/lib/integrations/spotify/provider"),
  ])

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
