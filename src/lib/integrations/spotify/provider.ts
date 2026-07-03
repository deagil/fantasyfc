import "@tanstack/react-start/server-only"

import { registerProvider } from "@/lib/integrations/registry"
import type { ExchangedTokens, IntegrationProvider } from "@/lib/integrations/types"

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
const TOKEN_URL = "https://accounts.spotify.com/api/token"

export const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
]

function clientId() {
  const id = process.env.SPOTIFY_CLIENT_ID
  if (!id) {
    throw new Error("SPOTIFY_CLIENT_ID is not set")
  }
  return id
}

async function fetchDisplayName(accessToken: string) {
  try {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) {
      return undefined
    }
    const data = (await response.json()) as { display_name?: string }
    return data.display_name
  } catch {
    return undefined
  }
}

async function tokensFromResponse(
  response: Response,
  fallbackRefreshToken?: string
): Promise<ExchangedTokens> {
  if (!response.ok) {
    throw new Error(`Spotify token request failed: ${await response.text()}`)
  }

  const data = (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope?: string
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? fallbackRefreshToken ?? null,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    scopes: data.scope ? data.scope.split(" ") : [],
    accountLabel: await fetchDisplayName(data.access_token),
  }
}

export const spotifyProvider: IntegrationProvider = {
  id: "spotify",

  authorizationUrl({ state, codeChallenge, redirectUri }) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId(),
      scope: SPOTIFY_SCOPES.join(" "),
      redirect_uri: redirectUri,
      state,
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
    })
    return `${AUTHORIZE_URL}?${params.toString()}`
  },

  async exchangeCode({ code, codeVerifier, redirectUri }) {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId(),
        code_verifier: codeVerifier,
      }),
    })
    return tokensFromResponse(response)
  },

  async refresh(refreshToken) {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId(),
      }),
    })
    return tokensFromResponse(response, refreshToken)
  },
}

registerProvider(spotifyProvider)
