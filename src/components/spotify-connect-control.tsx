import { useEffect, useState } from "react"
import { useServerFn } from "@tanstack/react-start"

import { Button } from "@/components/ui/button"
import { SettingsRow } from "@/components/settings-row"
import { syncServerSession } from "@/lib/auth/auth-fns"
import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import { disconnectProvider, getConnection } from "@/lib/integrations/connections"

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
  const syncSession = useServerFn(syncServerSession)
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

      if (!session) {
        setConnectError("Sign in again, then retry connecting Spotify.")
        return
      }

      await syncSession({
        data: {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        },
      })

      const params = new URLSearchParams({
        origin: window.location.origin,
      })
      window.location.assign(`/spotify-connect?${params.toString()}`)
    } catch {
      setConnectError("Could not start Spotify connect. Try again.")
    } finally {
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
