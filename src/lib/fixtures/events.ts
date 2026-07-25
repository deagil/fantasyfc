import type {
  FplElement,
  FplElementTypeId,
  FplFixture,
  FplFixtureStat,
  FplFixtureStatIdentifier,
} from "@/lib/fpl/types"

export type MatchSide = "h" | "a"

export type MatchEventPlayer = {
  element: number
  webName: string
  value: number
  side: MatchSide
}

export type MatchEventSection = {
  identifier: FplFixtureStatIdentifier
  label: string
  home: MatchEventPlayer[]
  away: MatchEventPlayer[]
}

export type BpsRow = {
  element: number
  webName: string
  side: MatchSide
  bps: number
  projectedBonus: number
}

export type DefconRow = {
  element: number
  webName: string
  side: MatchSide
  elementType: FplElementTypeId
  value: number
  threshold: number
}

const DEFCON_THRESHOLDS: Record<FplElementTypeId, number | null> = {
  1: null,
  2: 10,
  3: 12,
  4: null,
}

function resolveWebName(
  elementId: number,
  elementsById: Map<number, FplElement>
): string {
  return elementsById.get(elementId)?.web_name ?? `Player ${elementId}`
}

function mapSide(
  values: FplFixtureStat["h"],
  side: MatchSide,
  elementsById: Map<number, FplElement>
): MatchEventPlayer[] {
  return values.map((entry) => ({
    element: entry.element,
    webName: resolveWebName(entry.element, elementsById),
    value: entry.value,
    side,
  }))
}

function findStat(
  fixture: FplFixture,
  identifier: FplFixtureStatIdentifier
): FplFixtureStat | undefined {
  return fixture.stats.find((stat) => stat.identifier === identifier)
}

export function getStatSectionLabel(
  identifier: FplFixtureStatIdentifier
): string {
  switch (identifier) {
    case "goals_scored":
      return "Goals"
    case "assists":
      return "Assists"
    case "own_goals":
      return "Own goals"
    case "penalties_saved":
      return "Penalties saved"
    case "penalties_missed":
      return "Penalties missed"
    case "yellow_cards":
      return "Yellow cards"
    case "red_cards":
      return "Red cards"
    case "saves":
      return "Saves"
    case "bonus":
      return "Bonus"
    case "bps":
      return "BPS"
    case "defensive_contribution":
      return "Defensive contributions"
    default: {
      const exhaustiveCheck: never = identifier
      return exhaustiveCheck
    }
  }
}

const EVENT_IDENTIFIERS: FplFixtureStatIdentifier[] = [
  "goals_scored",
  "assists",
  "own_goals",
  "penalties_saved",
  "penalties_missed",
  "yellow_cards",
  "red_cards",
  "saves",
]

export function getMatchEvents(
  fixture: FplFixture,
  elementsById: Map<number, FplElement>
): MatchEventSection[] {
  const sections: MatchEventSection[] = []

  for (const identifier of EVENT_IDENTIFIERS) {
    const stat = findStat(fixture, identifier)
    if (!stat) {
      continue
    }

    const home = mapSide(stat.h, "h", elementsById)
    const away = mapSide(stat.a, "a", elementsById)
    if (home.length === 0 && away.length === 0) {
      continue
    }

    sections.push({
      identifier,
      label: getStatSectionLabel(identifier),
      home,
      away,
    })
  }

  return sections
}

/**
 * FPL bonus: 3/2/1 to the top three BPS scores. Tied BPS share the points for
 * that place and the next place(s) are skipped (e.g. two on top BPS both get 3,
 * next unique BPS gets 1).
 */
export function projectBonus(
  rows: Array<{ element: number; bps: number }>
): Map<number, number> {
  const bonusByElement = new Map<number, number>()
  if (rows.length === 0) {
    return bonusByElement
  }

  const sorted = [...rows].sort((left, right) => right.bps - left.bps)
  let place = 1
  let index = 0

  while (index < sorted.length && place <= 3) {
    const bps = sorted[index]!.bps
    const tied: typeof sorted = []

    while (index < sorted.length && sorted[index]!.bps === bps) {
      tied.push(sorted[index]!)
      index += 1
    }

    const pointsForPlace = place === 1 ? 3 : place === 2 ? 2 : 1
    for (const row of tied) {
      bonusByElement.set(row.element, pointsForPlace)
    }

    place += tied.length
  }

  return bonusByElement
}

export function getBpsTable(
  fixture: FplFixture,
  elementsById: Map<number, FplElement>,
  limit?: number
): BpsRow[] {
  const stat = findStat(fixture, "bps")
  if (!stat) {
    return []
  }

  const rows: Array<{ element: number; webName: string; side: MatchSide; bps: number }> =
    [
      ...stat.h.map((entry) => ({
        element: entry.element,
        webName: resolveWebName(entry.element, elementsById),
        side: "h" as const,
        bps: entry.value,
      })),
      ...stat.a.map((entry) => ({
        element: entry.element,
        webName: resolveWebName(entry.element, elementsById),
        side: "a" as const,
        bps: entry.value,
      })),
    ].sort((left, right) => right.bps - left.bps || left.element - right.element)

  const limited = limit == null ? rows : rows.slice(0, limit)
  const projected = projectBonus(limited.length === rows.length ? rows : rows)

  return limited.map((row) => ({
    ...row,
    projectedBonus: projected.get(row.element) ?? 0,
  }))
}

export function getAwardedBonus(
  fixture: FplFixture,
  elementsById: Map<number, FplElement>
): MatchEventPlayer[] {
  const stat = findStat(fixture, "bonus")
  if (!stat) {
    return []
  }

  return [
    ...mapSide(stat.h, "h", elementsById),
    ...mapSide(stat.a, "a", elementsById),
  ].sort((left, right) => right.value - left.value)
}

export function getDefconRows(
  fixture: FplFixture,
  elementsById: Map<number, FplElement>
): DefconRow[] {
  const stat = findStat(fixture, "defensive_contribution")
  if (!stat) {
    return []
  }

  const rows: DefconRow[] = []

  for (const side of ["h", "a"] as const) {
    for (const entry of stat[side]) {
      const element = elementsById.get(entry.element)
      const elementType = (element?.element_type ?? 3) as FplElementTypeId
      const threshold = DEFCON_THRESHOLDS[elementType]
      if (threshold == null || entry.value < threshold) {
        continue
      }

      rows.push({
        element: entry.element,
        webName: resolveWebName(entry.element, elementsById),
        side,
        elementType,
        value: entry.value,
        threshold,
      })
    }
  }

  return rows.sort((left, right) => right.value - left.value)
}
