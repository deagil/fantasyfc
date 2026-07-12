import { useState } from "react"

import { useEnrichmentMaps } from "@/lib/enrichment/hooks"
import { sizedImageUrl } from "@/lib/enrichment/model"
import { getPlayerInitials } from "@/lib/fpl/players"
import { cn } from "@/lib/utils"

type PlayerAvatarSize = "sm" | "md"

const SIZE_CLASS: Record<PlayerAvatarSize, string> = {
  sm: "size-8 rounded-md text-[10px]",
  md: "size-11 rounded-lg text-xs",
}

type AvatarArt = {
  url: string
  kind: "render" | "cutout" | "thumb"
}

/**
 * Prefer a full-body render so we can tight-crop the head; fall back to
 * cutout/thumb, then initials.
 *
 * SportsDB renders are square full-body shots: heads sit in roughly the top
 * 15% and often drift left/right with pose. A ~3× top-centered window keeps
 * head + shoulders without clipping the leanier outliers as hard as a face
 * lock would.
 */
function resolveAvatarArt(options: {
  renderUrl: string | null | undefined
  cutoutUrl: string | null | undefined
  thumbUrl: string | null | undefined
}): AvatarArt | null {
  // Medium stays sharp when we zoom ~3× into a 44px (retina ~88px) slot.
  const render = sizedImageUrl(options.renderUrl ?? null, "medium")
  if (render) {
    return { url: render, kind: "render" }
  }
  const cutout = sizedImageUrl(options.cutoutUrl ?? null, "small")
  if (cutout) {
    return { url: cutout, kind: "cutout" }
  }
  const thumb = sizedImageUrl(options.thumbUrl ?? null, "tiny")
  return thumb ? { url: thumb, kind: "thumb" } : null
}

type PlayerAvatarProps = {
  playerCode: number
  name: string
  size?: PlayerAvatarSize
  className?: string
}

export function PlayerAvatar({
  playerCode,
  name,
  size = "md",
  className,
}: PlayerAvatarProps) {
  const { playersByCode } = useEnrichmentMaps()
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const enrichment = playersByCode.get(playerCode)
  const art = resolveAvatarArt({
    renderUrl: enrichment?.renderUrl,
    cutoutUrl: enrichment?.cutoutUrl,
    thumbUrl: enrichment?.thumbUrl,
  })
  const showArt = art != null && failedUrl !== art.url

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-muted font-semibold text-muted-foreground",
        SIZE_CLASS[size],
        className
      )}
    >
      {showArt && art ? (
        <img
          alt=""
          src={art.url}
          className={cn(
            "absolute max-w-none",
            art.kind === "render"
              ? // ~3× window on the top-center; slight top pull uses the
                // usual headroom above hair without losing off-center faces.
                "left-1/2 top-[-4%] h-[300%] w-[300%] -translate-x-1/2"
              : art.kind === "cutout"
                ? "left-1/2 top-[-2%] h-[165%] w-[165%] -translate-x-1/2"
                : "inset-0 size-full object-cover object-top"
          )}
          onError={() => setFailedUrl(art.url)}
        />
      ) : (
        getPlayerInitials(name)
      )}
    </span>
  )
}
