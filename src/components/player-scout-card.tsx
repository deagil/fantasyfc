import {
  formatPlayerForm,
  formatPlayerPrice,
  getElementTypeLabel,
  getPlayerClubShortName,
  getPlayerInitials,
} from "@/lib/fpl/players"
import type { FplElement, FplTeam } from "@/lib/fpl/types"
import { cn } from "@/lib/utils"

type PlayerScoutCardProps = {
  player: FplElement
  teamsById: Map<number, FplTeam>
  isSelected: boolean
  onSelect: (player: FplElement) => void
}

export function PlayerScoutCard({
  player,
  teamsById,
  isSelected,
  onSelect,
}: PlayerScoutCardProps) {
  const clubShortName = getPlayerClubShortName(player, teamsById)
  const positionLabel = getElementTypeLabel(player.element_type)

  return (
    <button
      type="button"
      data-tile-row
      data-selected={isSelected ? "true" : undefined}
      onClick={() => onSelect(player)}
      className={cn(
        "flex min-h-22 flex-col gap-2 rounded-xl p-3 text-left active:scale-[0.99]"
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
        >
          {getPlayerInitials(player.web_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{player.web_name}</p>
          <p className="truncate text-xs" data-tile-row-muted>
            {clubShortName} · {positionLabel}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
        <span className="font-medium">{formatPlayerPrice(player.now_cost)}</span>
        <span data-tile-row-muted>
          Form {formatPlayerForm(player.form)}
        </span>
      </div>
    </button>
  )
}
