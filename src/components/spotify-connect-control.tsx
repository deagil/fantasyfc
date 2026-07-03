import { useCallback, useEffect, useState } from "react"
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
  const [connectUrl, setConnectUrl] = useState<string | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
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

  const prepareConnectUrl = useCallback(async () => {
    setConnectError(null)
    setConnectUrl(null)
    setIsPreparing(true)

    try {
      const supabase = createBrowserSupabaseClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token || !session.refresh_token) {
        setConnectError("Sign in again, then retry connecting Spotify.")
        return
      }

      const { url } = await beginConnect({
        data: {
          origin: window.location.origin,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        },
      })

      setConnectUrl(url)
    } catch {
      setConnectError("Could not prepare Spotify connect. Try again.")
    } finally {
      setIsPreparing(false)
    }
  }, [beginConnect])

  useEffect(() => {
    if (!isLoading && !accountLabel) {
      void prepareConnectUrl()
    }
  }, [accountLabel, isLoading, prepareConnectUrl])

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

  const connectLabel = isPreparing
    ? "Preparing..."
    : connectUrl
      ? "Connect"
      : "Retry"

  return (
    <div className="flex flex-col gap-1">
      <SettingsRow
        label={spotifyLabel}
        value="Not connected"
        action={
          connectUrl ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={connectUrl} />}
            >
              {connectLabel}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPreparing}
              onClick={() => void prepareConnectUrl()}
            >
              {connectLabel}
            </Button>
          )
        }
      />
      {connectError ? (
        <p className="text-destructive">{connectError}</p>
      ) : null}
    </div>
  )
}
