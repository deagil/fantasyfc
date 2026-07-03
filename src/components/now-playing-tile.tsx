import { useState } from "react"
import { CheckIcon, LinkIcon } from "lucide-react"

import { DataTile } from "@/components/data-tile"
import { NowPlayingPlayer } from "@/components/now-playing-player"
import { ScrollingTicker } from "@/components/scrolling-ticker"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth/auth-context"
import { HUB_PLAYLIST_FALLBACK_NAME } from "@/lib/integrations/spotify/playlist"
import { useSpotifyPlayer } from "@/lib/integrations/spotify/player-context"
import { cn } from "@/lib/utils"

const TILE_DISCONNECTED_TITLE = "Fantasy FC Trax"

export function NowPlayingTile({
  className,
  comingSoon = false,
}: {
  className?: string
  comingSoon?: boolean
}) {
  const { isLoggedIn } = useAuth()
  const {
    isConnected,
    isReady,
    playerError,
    track,
    playlistPreview,
    isPaused,
    position,
    duration,
    canSkipPrev,
    canSkipNext,
    togglePlay,
    skipPrev,
    skipNext,
  } = useSpotifyPlayer()

  const [copied, setCopied] = useState(false)

  const isSpotifyAvailable = isLoggedIn && isConnected
  const isIdle = !track
  const tickerText = track
    ? `${track.name} · ${track.artists}`
    : (playlistPreview?.name ?? HUB_PLAYLIST_FALLBACK_NAME)
  const albumArtUrl = track?.albumArtUrl ?? playlistPreview?.imageUrl ?? null

  async function copyTrackLink() {
    if (!track?.url) {
      return
    }

    try {
      await navigator.clipboard.writeText(track.url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable — ignore silently
    }
  }

  return (
    <DataTile size="1x1" comingSoon={comingSoon} className={className}>
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 p-3">
        <div className="relative z-10 flex min-w-0 items-center gap-2">
          {isSpotifyAvailable ? (
            <ScrollingTicker
              text={tickerText}
              className="min-w-0 flex-1 text-lg font-semibold text-foreground"
            />
          ) : (
            <p className="min-w-0 flex-1 text-lg font-semibold text-foreground">
              {TILE_DISCONNECTED_TITLE}
            </p>
          )}
          {track ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn(
                "shrink-0 text-muted-foreground hover:text-foreground",
                copied && "text-foreground"
              )}
              aria-label={copied ? "Link copied" : "Copy link to song"}
              onClick={() => void copyTrackLink()}
            >
              {copied ? <CheckIcon /> : <LinkIcon />}
            </Button>
          ) : null}
        </div>

        <div className="box-border size-full min-h-0 overflow-hidden p-3 pt-0">
          {!isSpotifyAvailable ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <img
                src="/images/spotify_logo.svg"
                alt=""
                aria-hidden="true"
                className="size-14"
              />
              <DataTile.EmptyState>Login to play menu music</DataTile.EmptyState>
            </div>
          ) : playerError ? (
            <DataTile.EmptyState className="flex h-full items-center justify-center text-center">
              {playerError}
            </DataTile.EmptyState>
          ) : !isReady ? (
            <DataTile.EmptyState className="flex h-full items-center justify-center text-center">
              Connecting to Spotify...
            </DataTile.EmptyState>
          ) : (
            <NowPlayingPlayer
              albumArtUrl={albumArtUrl}
              isPaused={isIdle || isPaused}
              isIdle={isIdle}
              position={position}
              duration={duration}
              canSkipPrev={canSkipPrev}
              canSkipNext={canSkipNext}
              onPlayPause={togglePlay}
              onSkipPrev={skipPrev}
              onSkipNext={skipNext}
              className="mx-auto aspect-square h-full w-auto max-w-full"
            />
          )}
        </div>
      </div>
    </DataTile>
  )
}
