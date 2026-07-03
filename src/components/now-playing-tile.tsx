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
          <ScrollingTicker
            text={tickerText}
            className="min-w-0 flex-1 text-lg font-semibold text-foreground"
          />
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
          {!isLoggedIn || !isConnected ? (
            <DataTile.EmptyState className="flex h-full items-center justify-center text-center">
              Connect Spotify in account settings to play music here.
            </DataTile.EmptyState>
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
