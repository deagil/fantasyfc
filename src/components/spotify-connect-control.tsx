import { useEffect, useState } from "react"
import { useServerFn } from "@tanstack/react-start"

import { Button } from "@/components/ui/button"
import { SettingsRow } from "@/components/settings-row"
import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import { disconnectProvider, getConnection } from "@/lib/integrations/connections"
import { startSpotifyConnect } from "@/lib/integrations/spotify/server"

const spotifyLabel = (
  <span className="inline-flex items-center gap-1.5">
    Spotify
    <img
      src="/images/spotify_logo.svg"
      alt=""
      aria-hidden
      className="size-4"
    />
  </span>
)

export function SpotifyConnectControl() {
  const fetchConnection = useServerFn(getConnection)
  const beginConnect = useServerFn(startSpotifyConnect)
  const disconnect = useServerFn(disconnectProvider)

  const [accountLabel, setAccountLabel] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void fetchConnection({ data: { provider: "spotify" } })
      .then((connection) => {
        if (!cancelled) {
          setAccountLabel(connection ? (connection.accountLabel ?? "Spotify") : null)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [fetchConnection])

  const handleConnect = async () => {
    setConnectError(null)
    setIsConnecting(true)

    try {
      const supabase = createBrowserSupabaseClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token || !session.refresh_token) {
        setConnectError("Sign in again, then retry connecting Spotify.")
        setIsConnecting(false)
        return
      }

      const { url } = await beginConnect({
        data: {
          origin: window.location.origin,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        },
      })

      window.location.assign(url)
    } catch {
      setConnectError("Could not start Spotify connect. Try again.")
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    await disconnect({ data: { provider: "spotify" } })
    setAccountLabel(null)
  }

  if (isLoading) {
    return null
  }

  if (accountLabel) {
    return (
      <SettingsRow
        label={spotifyLabel}
        value={
          accountLabel !== "Spotify" ? `Connected as ${accountLabel}` : "Connected"
        }
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleDisconnect()}
          >
            Disconnect
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <SettingsRow
        label={spotifyLabel}
        value="Not connected"
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isConnecting}
            onClick={() => void handleConnect()}
          >
            {isConnecting ? "Connecting..." : "Connect"}
          </Button>
        }
      />
      {connectError ? (
        <p className="text-destructive">{connectError}</p>
      ) : null}
    </div>
  )
}
