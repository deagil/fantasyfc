import type { MatchSide } from "@/lib/fixtures/events"
import type { FplElement, FplEntryPicks, FplEventLive, FplPick } from "@/lib/fpl/types"

export type FixturePlayerPoints = {
  element: number
  totalPoints: number
  stats: Array<{ identifier: string; points: number; value: number }>
}

export type YourPlayerInFixture = {
  element: number
  webName: string
  pick: FplPick
  points: number
  appliedPoints: number
  isOnBench: boolean
  side: MatchSide
}

/**
 * Per-player FPL points attributable to a single fixture, via live explain[].
 */
export function getFixturePointsByElement(
  eventLive: FplEventLive | null | undefined,
  fixtureId: number
): Map<number, FixturePlayerPoints> {
  const result = new Map<number, FixturePlayerPoints>()
  if (!eventLive) {
    return result
  }

  for (const element of eventLive.elements) {
    const explainEntries = element.explain ?? []
    const explain = explainEntries.find((entry) => entry.fixture === fixtureId)
    if (!explain) {
      continue
    }

    const totalPoints = explain.stats.reduce(
      (sum, stat) => sum + stat.points,
      0
    )

    result.set(element.id, {
      element: element.id,
      totalPoints,
      stats: explain.stats.map((stat) => ({
        identifier: stat.identifier,
        points: stat.points,
        value: stat.value,
      })),
    })
  }

  return result
}

export function getYourPlayersInFixture(
  picks: FplEntryPicks | null | undefined,
  pointsByElement: Map<number, FixturePlayerPoints>,
  elementsById: Map<number, FplElement>,
  homeTeamId: number,
  awayTeamId: number
): YourPlayerInFixture[] {
  if (!picks) {
    return []
  }

  const rows: YourPlayerInFixture[] = []

  for (const pick of picks.picks) {
    const element = elementsById.get(pick.element)
    if (!element) {
      continue
    }

    if (element.team !== homeTeamId && element.team !== awayTeamId) {
      continue
    }

    const points = pointsByElement.get(pick.element)?.totalPoints ?? 0
    const isOnBench = pick.multiplier === 0

    rows.push({
      element: pick.element,
      webName: element.web_name,
      pick,
      points,
      appliedPoints: points * pick.multiplier,
      isOnBench,
      side: element.team === homeTeamId ? "h" : "a",
    })
  }

  return rows.sort((left, right) => {
    if (left.isOnBench !== right.isOnBench) {
      return left.isOnBench ? 1 : -1
    }
    return right.appliedPoints - left.appliedPoints || left.pick.position - right.pick.position
  })
}

export function isBonusAddedForEvent(
  statusDays: Array<{ event: number; bonus_added: boolean }> | undefined,
  eventId: number
): boolean {
  if (!statusDays || statusDays.length === 0) {
    return false
  }

  const matching = statusDays.filter((day) => day.event === eventId)
  if (matching.length === 0) {
    return false
  }

  return matching.every((day) => day.bonus_added)
}
