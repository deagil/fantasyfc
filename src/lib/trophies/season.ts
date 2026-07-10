import type { FplEvent } from "@/lib/fpl/types"
import type { TrophyMedal } from "@/lib/trophies/types"

/** Derive `2025/26`-style label from bootstrap event deadlines. */
export function getSeasonLabel(events: FplEvent[]): string {
  if (events.length === 0) {
    throw new Error("Cannot derive season label without events")
  }

  const firstDeadline = new Date(events[0].deadline_time)
  const year = firstDeadline.getUTCFullYear()
  // GW1 is typically August; deadlines before July belong to the prior start year.
  const seasonStartYear = firstDeadline.getUTCMonth() >= 6 ? year : year - 1
  const endShort = String((seasonStartYear + 1) % 100).padStart(2, "0")
  return `${seasonStartYear}/${endShort}`
}

export function medalForRank(rank: 1 | 2 | 3): TrophyMedal {
  switch (rank) {
    case 1:
      return "gold"
    case 2:
      return "silver"
    case 3:
      return "bronze"
    default: {
      const _exhaustive: never = rank
      return _exhaustive
    }
  }
}

/** Points ahead of the next rank down (gold vs silver, bronze vs 4th). */
export function marginToNext(
  podiumPoints: number,
  nextRankPoints: number | undefined
): number {
  if (nextRankPoints === undefined) {
    return 0
  }

  return Math.max(0, podiumPoints - nextRankPoints)
}
