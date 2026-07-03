import type { FplElement, FplPick } from "@/lib/fpl/types"

export type TeamTopScorer = {
  id: number
  name: string
  points: number
}

export function buildPointsByElementId(
  liveElements: Array<{ id: number; stats: { total_points: number } }>
): Map<number, number> {
  const pointsByElementId = new Map<number, number>()

  for (const element of liveElements) {
    pointsByElementId.set(element.id, element.stats.total_points)
  }

  return pointsByElementId
}

export function getTopScorers(
  picks: FplPick[],
  pointsByElementId: Map<number, number>,
  elementsById: Map<number, FplElement>,
  count = 3
): TeamTopScorer[] {
  return picks
    .reduce<TeamTopScorer[]>((scorers, pick) => {
      if (pick.multiplier <= 0) {
        return scorers
      }

      const basePoints = pointsByElementId.get(pick.element) ?? 0
      scorers.push({
        id: pick.element,
        name: elementsById.get(pick.element)?.web_name ?? "Unknown",
        points: basePoints * pick.multiplier,
      })
      return scorers
    }, [])
    .sort((left, right) => right.points - left.points)
    .slice(0, count)
}
