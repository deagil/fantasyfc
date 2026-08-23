import { useState } from "react"

import { useEnrichmentMaps } from "@/lib/enrichment/hooks"
import { sizedImageUrl } from "@/lib/enrichment/model"
import { getPointsChipTone, POINTS_CHIP_CLASS } from "@/lib/fpl/points-chip"
import { getPlayerInitials } from "@/lib/fpl/players"
import type { SquadSlot } from "@/lib/fpl/squad"
import {
  getCardFoilSkin,
  getPitchCardFoilOverall,
} from "@/lib/ratings/card-foil"
import { cn } from "@/lib/utils"

function resolveCardArtUrl(options: {
  renderUrl: string | null | undefined
  cutoutUrl: string | null | undefined
  thumbUrl: string | null | undefined
}): { url: string; kind: "render" | "cutout" | "thumb" } | null {
  const render = sizedImageUrl(options.renderUrl ?? null, "small")
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
  const art = resolveCardArtUrl({
    renderUrl: enrichment?.renderUrl,
    cutoutUrl: enrichment?.cutoutUrl,
    thumbUrl: enrichment?.thumbUrl,
  })
  const visibleArt = art != null && failedUrl !== art.url ? art : null
  const pipClass = injuryPipClassName(slot.player.status)
  const armband = slot.pick.is_captain
    ? "C"
    : slot.pick.is_vice_captain
      ? "V"
      : null
  const foil = getCardFoilSkin(getPitchCardFoilOverall(slot.overall))
  const chipTone =
    slot.eventPoints != null
      ? getPointsChipTone(slot.eventPoints, slot.eventMinutes)
      : null

  return (
    <button
      type="button"
      data-tile-row
      data-selected={selected ? "true" : undefined}
      onClick={() => onSelect(slot.player.id)}
      aria-label={
        slot.eventPoints != null
          ? `${slot.player.web_name}, ${slot.eventPoints} points`
          : slot.player.web_name
      }
      aria-pressed={selected}
      className={cn(
        "relative flex flex-col items-center overflow-visible outline-none",
        compact ? "w-[3.15rem]" : "w-[3.7rem]",
        "focus-visible:ring-2 focus-visible:ring-white/70"
      )}
    >
      <span className="relative w-full">
        <span
          className={cn(
            "relative flex w-full items-end justify-center overflow-hidden rounded-md",
            compact ? "aspect-[5/6]" : "aspect-[4/5]",
            selected && "ring-2 ring-pl-green"
          )}
          style={{
            background: foil.background,
            boxShadow: `inset 0 0 0 1px ${foil.frame}`,
          }}
        >
          {visibleArt ? (
            <img
              alt=""
              src={visibleArt.url}
              onError={() => setFailedUrl(visibleArt.url)}
              className={cn(
                "pointer-events-none h-[118%] w-full object-contain object-bottom drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]",
                visibleArt.kind === "thumb" && "h-full object-cover object-top"
              )}
            />
          ) : (
            <span
              className="mb-1 flex size-7 items-center justify-center rounded-full text-[10px] font-semibold"
              style={{
                background: "rgba(0,0,0,0.28)",
                color: foil.text,
              }}
            >
              {getPlayerInitials(slot.player.web_name)}
            </span>
          )}
        </span>

        {pipClass ? (
          <span
            aria-hidden
            className={cn(
              "absolute top-0.5 left-0.5 z-20 size-1.5 rounded-full ring-1 ring-white/80",
              pipClass
            )}
          />
        ) : null}

        {armband ? (
          <span
            className={cn(
              "absolute bottom-0.5 left-0.5 z-20 flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold shadow-sm",
              armband === "C"
                ? "bg-pl-yellow text-pl-purple"
                : "bg-foreground text-background"
            )}
          >
            {armband}
          </span>
        ) : null}

        {chipTone != null && slot.eventPoints != null ? (
          <span
            aria-hidden
            className={cn(
              "absolute z-30 flex items-center justify-center rounded-full font-bold text-white shadow-[0_1px_4px_rgba(0,0,0,0.45)]",
              compact
                ? "-top-1.5 -right-1.5 size-[1.05rem] text-[8px]"
                : "-top-1.5 -right-1.5 size-[1.15rem] text-[9px]",
              POINTS_CHIP_CLASS[chipTone]
            )}
          >
            {slot.eventPoints}
          </span>
        ) : null}
      </span>

      <span
        className={cn(
          "mt-0.5 w-full truncate text-center leading-tight font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
          compact ? "text-[9px]" : "text-[10px]"
        )}
      >
        {slot.player.web_name}
      </span>
    </button>
  )
}
