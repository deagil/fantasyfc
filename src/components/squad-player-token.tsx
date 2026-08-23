import { useState } from "react"

import { useEnrichmentMaps } from "@/lib/enrichment/hooks"
import { sizedImageUrl } from "@/lib/enrichment/model"
import { getPlayerInitials } from "@/lib/fpl/players"
import type { SquadSlot } from "@/lib/fpl/squad"
import { ratingTextClassName } from "@/lib/ratings/tone"
import { cn } from "@/lib/utils"

type PitchArt = {
  url: string
  kind: "cutout" | "render" | "thumb"
}

function resolvePitchArt(options: {
  cutoutUrl: string | null | undefined
  renderUrl: string | null | undefined
  thumbUrl: string | null | undefined
}): PitchArt | null {
  const cutout = sizedImageUrl(options.cutoutUrl ?? null, "small")
  if (cutout) {
    return { url: cutout, kind: "cutout" }
  }
  const render = sizedImageUrl(options.renderUrl ?? null, "small")
  if (render) {
    return { url: render, kind: "render" }
  }
  const thumb = sizedImageUrl(options.thumbUrl ?? null, "tiny")
  return thumb ? { url: thumb, kind: "thumb" } : null
}

function injuryPipClassName(
  status: SquadSlot["player"]["status"]
): string | null {
  switch (status) {
    case "a":
      return null
    case "d":
      return "bg-pl-yellow"
    case "i":
    case "s":
    case "n":
    case "u":
      return "bg-pl-pink"
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function SquadPlayerToken({
  slot,
  compact = false,
  selected = false,
  onSelect,
}: {
  slot: SquadSlot
  compact?: boolean
  selected?: boolean
  onSelect: (playerId: number) => void
}) {
  const { playersByCode } = useEnrichmentMaps()
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const enrichment = playersByCode.get(slot.player.code)
  const art = resolvePitchArt({
    cutoutUrl: enrichment?.cutoutUrl,
    renderUrl: enrichment?.renderUrl,
    thumbUrl: enrichment?.thumbUrl,
  })
  const showArt = art != null && failedUrl !== art.url
  const pipClass = injuryPipClassName(slot.player.status)
  const armband = slot.pick.is_captain
    ? "C"
    : slot.pick.is_vice_captain
      ? "V"
      : null

  return (
    <button
      type="button"
      data-tile-row
      data-selected={selected ? "true" : undefined}
      onClick={() => onSelect(slot.player.id)}
      aria-label={slot.player.web_name}
      aria-pressed={selected}
      className={cn(
        "relative flex min-h-10 min-w-10 flex-col items-center outline-none",
        compact ? "w-[3.15rem] pt-6" : "w-[3.75rem] pt-8",
        "focus-visible:ring-2 focus-visible:ring-white/70"
      )}
    >
      {showArt && art ? (
        <img
          alt=""
          src={art.url}
          onError={() => setFailedUrl(art.url)}
          className={cn(
            "pointer-events-none absolute z-10 object-contain object-bottom drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]",
            compact
              ? "bottom-[2.15rem] h-11 w-11"
              : "bottom-[2.4rem] h-[3.15rem] w-[3.15rem]",
            art.kind === "render" && "object-cover object-top"
          )}
        />
      ) : (
        <span
          className={cn(
            "absolute z-10 flex items-center justify-center rounded-full bg-white/90 font-semibold text-foreground shadow-sm",
            compact
              ? "bottom-[2.15rem] size-8 text-[10px]"
              : "bottom-[2.4rem] size-10 text-xs"
          )}
        >
          {getPlayerInitials(slot.player.web_name)}
        </span>
      )}

      {pipClass ? (
        <span
          aria-hidden
          className={cn(
            "absolute z-20 size-1.5 rounded-full ring-1 ring-white/80",
            compact ? "top-5 right-1.5" : "top-6 right-2",
            pipClass
          )}
        />
      ) : null}

      <span
        className={cn(
          "relative z-0 flex w-full flex-col items-center rounded-md bg-white px-1 shadow-[0_1px_4px_rgba(0,0,0,0.28)] lg:rounded-[2px]",
          compact ? "pb-0.5 pt-3" : "pb-1 pt-3.5",
          selected && "ring-2 ring-pl-green"
        )}
      >
        <span className="flex w-full items-center justify-center gap-0.5">
          {slot.overall != null ? (
            <span
              className={cn(
                "font-semibold tabular-nums leading-none",
                compact ? "text-[10px]" : "text-xs",
                ratingTextClassName(slot.overall)
              )}
            >
              {slot.overall}
            </span>
          ) : null}
          {armband ? (
            <span
              className={cn(
                "flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold",
                armband === "C"
                  ? "bg-pl-yellow text-pl-purple"
                  : "bg-foreground text-background"
              )}
            >
              {armband}
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            "w-full truncate text-center font-semibold leading-tight text-foreground",
            compact ? "text-[9px]" : "text-[10px]"
          )}
        >
          {slot.player.web_name}
        </span>
        {slot.eventPoints != null ? (
          <span className="text-[10px] font-normal tabular-nums leading-none text-foreground/80">
            {slot.eventPoints}
          </span>
        ) : null}
      </span>
    </button>
  )
}
