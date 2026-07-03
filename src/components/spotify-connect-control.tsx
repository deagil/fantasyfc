import { useEffect, useState } from "react"
import { useServerFn } from "@tanstack/react-start"

import { Button } from "@/components/ui/button"
import { SettingsRow } from "@/components/settings-row"
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
  const startConnect = useServerFn(startSpotifyConnect)
  const disconnect = useServerFn(disconnectProvider)

  const [accountLabel, setAccountLabel] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    let cancelled = false

    void fetchConnection({ data: { provider: "spotify" } }).then((connection) => {
      if (!cancelled) {
        setAccountLabel(connection ? (connection.accountLabel ?? "Spotify") : null)
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [fetchConnection])

  const handleConnect = async () => {
    setIsConnecting(true)
    const { url } = await startConnect()
    window.location.href = url
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
          <Button variant="outline" size="sm" onClick={() => void handleDisconnect()}>
            Disconnect
          </Button>
        }
      />
    )
  }

  return (
    <SettingsRow
      label={spotifyLabel}
      value="Not connected"
      action={
        <Button
          variant="outline"
          size="sm"
          disabled={isConnecting}
          onClick={() => void handleConnect()}
        >
          {isConnecting ? "Connecting..." : "Connect"}
        </Button>
      }
    />
  )
}
