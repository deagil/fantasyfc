import { AwardTrophySvg } from "@/components/award-trophy-svg"
import { ModularTrophySvg } from "@/components/modular-trophy-svg"
import type { TrophyMedal } from "@/lib/trophies/types"
import {
  TROPHY_VISUAL_STYLE,
  type TrophyVisualStyle,
} from "@/lib/trophies/trophy-visual"
import { cn } from "@/lib/utils"

export function TrophyMark({
  leagueId,
  medal,
  className,
  visual = TROPHY_VISUAL_STYLE,
}: {
  leagueId: number
  medal: TrophyMedal
  className?: string
  /** Override the default visual; defaults to TROPHY_VISUAL_STYLE. */
  visual?: TrophyVisualStyle
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex aspect-square w-full max-w-16 items-center justify-center transition-transform duration-300 ease-out group-hover/card:scale-105",
        className
      )}
    >
      {visual === "modular" ? (
        <ModularTrophySvg leagueId={leagueId} medal={medal} />
      ) : (
        <AwardTrophySvg medal={medal} />
      )}
    </div>
  )
}
