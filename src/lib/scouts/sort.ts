import {
  filterPlayersByPosition,
  sortPlayersByBonus,
  sortPlayersByPoints,
} from "@/lib/fpl/players"
import type { FplElement } from "@/lib/fpl/types"
import type { PlayerRatingSummary } from "@/lib/ratings/model"
import type { ScoutPreset } from "@/lib/scouts/presets"

export function sortPlayersForScout(
  players: readonly FplElement[],
  scout: ScoutPreset,
  ratingsById?: Map<number, PlayerRatingSummary>
): FplElement[] {
  const filtered = filterPlayersByPosition([...players], scout.positionFilter)

  switch (scout.sort) {
    case "overall": {
      if (!ratingsById || ratingsById.size === 0) {
        return sortPlayersByPoints(filtered)
      }

      return [...filtered].sort((left, right) => {
        const leftOverall = ratingsById.get(left.id)?.overall ?? 0
        const rightOverall = ratingsById.get(right.id)?.overall ?? 0
        if (rightOverall !== leftOverall) {
          return rightOverall - leftOverall
        }
        return left.web_name.localeCompare(right.web_name)
      })
    }
    case "bonus":
      return sortPlayersByBonus(filtered)
    case "points":
      return sortPlayersByPoints(filtered)
    default: {
      const _exhaustive: never = scout.sort
      return _exhaustive
    }
  }
}
