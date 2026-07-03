const LOCAL_APP_URL = "http://127.0.0.1:3000"

/** Canonical app origin without a trailing slash. */
export function resolveAppUrl(preferredOrigin?: string): string {
  if (preferredOrigin) {
    try {
      const url = new URL(preferredOrigin)
      const isLocal =
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname.endsWith(".localhost")

      if (url.protocol === "https:" || isLocal) {
        return url.origin
      }
    } catch {
      // Fall through to env-based resolution.
    }
  }

  const configured = process.env.APP_URL?.replace(/\/$/, "")
  if (configured) {
    return configured
  }

  const vercelUrl = process.env.VERCEL_URL?.replace(/\/$/, "")
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`
  }

  return LOCAL_APP_URL
}

export function spotifyRedirectUri(appOrigin: string): string {
  return `${appOrigin}/spotify-callback`
}
