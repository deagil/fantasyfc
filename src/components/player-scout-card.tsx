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
  /** Optional headline score shown on the right (e.g. overall rating). */
  score?: number | null
}

export function PlayerScoutCard({
  player,
  teamsById,
  isSelected,
  onSelect,
  score = null,
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
        "flex min-h-19 min-w-0 items-center gap-3 rounded-xl p-3 text-left active:scale-[0.99]"
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground"
      >
        {getPlayerInitials(player.web_name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">
          {player.web_name}
        </p>
        <p className="mt-0.5 truncate text-xs" data-tile-row-muted>
          {clubShortName} · {positionLabel}
        </p>
        <p className="mt-1 truncate text-xs tabular-nums" data-tile-row-muted>
          {formatPlayerPrice(player.now_cost)} · Form{" "}
          {formatPlayerForm(player.form)}
        </p>
      </div>
      {score != null ? (
        <span className="shrink-0 text-xl font-semibold tabular-nums leading-none">
          {score}
        </span>
      ) : null}
    </button>
  )
}
