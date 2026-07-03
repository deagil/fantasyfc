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
      <DataTile.Header className="p-3 pb-0">
        <DataTile.Heading className="min-w-0 flex-1">
          {isSpotifyAvailable ? (
            <ScrollingTicker
              text={tickerText}
              className="min-w-0 text-base font-semibold text-foreground lg:text-lg"
            />
          ) : (
            <DataTile.Label className="text-base lg:text-lg">
              {TILE_DISCONNECTED_TITLE}
            </DataTile.Label>
          )}
        </DataTile.Heading>
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
      </DataTile.Header>

      <DataTile.Content align="center" className="min-h-0 flex-1 p-3 pt-1">
        {!isSpotifyAvailable ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
            <img
              src="/images/spotify_logo.svg"
              alt=""
              aria-hidden="true"
              className="size-10 lg:size-14"
            />
            <DataTile.EmptyState className="text-xs leading-snug lg:text-sm">
              Login to play menu music
            </DataTile.EmptyState>
          </div>
        ) : playerError ? (
          <DataTile.EmptyState className="flex min-h-0 flex-1 items-center justify-center text-center">
            {playerError}
          </DataTile.EmptyState>
        ) : !isReady ? (
          <DataTile.EmptyState className="flex min-h-0 flex-1 items-center justify-center text-center">
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
      </DataTile.Content>
    </DataTile>
  )
}
