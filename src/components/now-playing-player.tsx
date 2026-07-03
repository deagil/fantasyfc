import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

type NowPlayingPlayerProps = {
  albumArtUrl: string | null
  isPaused: boolean
  isIdle: boolean
  position: number
  duration: number
  canSkipPrev: boolean
  canSkipNext: boolean
  onPlayPause: () => void
  onSkipPrev: () => void
  onSkipNext: () => void
  className?: string
}

const controlButtonClassName =
  "flex items-center justify-center rounded-full text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-40"

export function NowPlayingPlayer({
  albumArtUrl,
  isPaused,
  isIdle,
  position,
  duration,
  canSkipPrev,
  canSkipNext,
  onPlayPause,
  onSkipPrev,
  onSkipNext,
  className,
}: NowPlayingPlayerProps) {
  const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0
  const showProgress = !isIdle && duration > 0

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2px]",
        className
      )}
    >
      {albumArtUrl ? (
        <img
          src={albumArtUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-foreground/[0.08]" />
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/35"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10"
      />

      <div className="absolute inset-0 flex flex-col justify-end p-3">
        {isIdle ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              type="button"
              aria-label="Play"
              className={cn(controlButtonClassName, "size-14")}
              onClick={onPlayPause}
            >
              <PlayIcon className="size-7 text-white" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-5 pb-2">
            <button
              type="button"
              aria-label="Previous track"
              className={cn(controlButtonClassName, "size-9")}
              disabled={!canSkipPrev}
              onClick={onSkipPrev}
            >
              <SkipBackIcon className="size-5 text-white" />
            </button>
            <button
              type="button"
              aria-label={isPaused ? "Play" : "Pause"}
              className={cn(controlButtonClassName, "size-12")}
              onClick={onPlayPause}
            >
              {isPaused ? (
                <PlayIcon className="size-6 text-white" />
              ) : (
                <PauseIcon className="size-6 text-white" />
              )}
            </button>
            <button
              type="button"
              aria-label="Next track"
              className={cn(controlButtonClassName, "size-9")}
              disabled={!canSkipNext}
              onClick={onSkipNext}
            >
              <SkipForwardIcon className="size-5 text-white" />
            </button>
          </div>
        )}

        <div className="space-y-1">
          <div
            className="h-0.5 overflow-hidden rounded-full bg-white/30"
            role={showProgress ? "progressbar" : undefined}
            aria-valuenow={showProgress ? position : undefined}
            aria-valuemin={showProgress ? 0 : undefined}
            aria-valuemax={showProgress ? duration : undefined}
          >
            <div
              className={cn(
                "h-full rounded-full bg-white transition-[width] duration-300",
                !showProgress && "w-0"
              )}
              style={showProgress ? { width: `${progress}%` } : undefined}
            />
          </div>
          <div className="flex justify-between text-[9px] text-white/80 tabular-nums">
            <span>{showProgress ? formatTime(position) : "0:00"}</span>
            <span>{showProgress ? formatTime(duration) : "—"}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
