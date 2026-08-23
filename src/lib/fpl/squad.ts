import type { PlayerRatingSummary } from "@/lib/ratings/model"
import type { FplElement, FplElementTypeId, FplPick } from "@/lib/fpl/types"

export type SquadSlot = {
  pick: FplPick
  player: FplElement
  overall: number | null
  eventPoints: number | null
}

export type SquadLine = {
  type: FplElementTypeId
  slots: SquadSlot[]
}

/** Attack at the top of the pitch, keeper at the bottom — FIFA / FPL convention. */
const PITCH_LINE_ORDER: FplElementTypeId[] = [4, 3, 2, 1]

export function isStartingPick(pick: FplPick): boolean {
  return pick.position <= 11
}

export function splitPicks(picks: readonly FplPick[]): {
  starting: FplPick[]
  bench: FplPick[]
} {
  const starting: FplPick[] = []
  const bench: FplPick[] = []

  for (const pick of picks) {
    if (isStartingPick(pick)) {
      starting.push(pick)
    } else {
      bench.push(pick)
    }
  }

  starting.sort((left, right) => left.position - right.position)
  bench.sort((left, right) => left.position - right.position)
  return { starting, bench }
}

export function getFormation(starting: readonly FplPick[]): string {
  const defenders = starting.filter((pick) => pick.element_type === 2).length
  const midfielders = starting.filter((pick) => pick.element_type === 3).length
  const forwards = starting.filter((pick) => pick.element_type === 4).length
  return `${defenders}-${midfielders}-${forwards}`
}

export function getChipLabel(chip: string | null | undefined): string | null {
  if (chip == null || chip === "") {
    return null
  }

  switch (chip) {
    case "bboost":
      return "Bench Boost"
    case "3xc":
      return "Triple Captain"
    case "freehit":
      return "Free Hit"
    case "wildcard":
      return "Wildcard"
    default:
      return chip.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
  }
}

export function buildLivePointsByElement(
  liveElements:
    | Array<{ id: number; stats: { total_points: number } }>
    | undefined
): Map<number, number> {
  const pointsByElement = new Map<number, number>()
  for (const element of liveElements ?? []) {
    pointsByElement.set(element.id, element.stats.total_points)
  }
  return pointsByElement
}

export function getAppliedPoints(
  pick: FplPick,
  eventPoints: number | null
): number | null {
  if (eventPoints == null) {
    return null
  }
  return eventPoints * pick.multiplier
}

export function sumAppliedPoints(
  picks: readonly FplPick[],
  pointsByElement: Map<number, number>
): number {
  return picks.reduce((total, pick) => {
    const eventPoints = pointsByElement.get(pick.element) ?? 0
    return total + eventPoints * pick.multiplier
  }, 0)
}

export function buildSquadSlots(
  picks: readonly FplPick[],
  elementsById: Map<number, FplElement>,
  ratingsById: Map<number, PlayerRatingSummary>,
  pointsByElement: Map<number, number>
): SquadSlot[] {
  return picks.flatMap((pick) => {
    const player = elementsById.get(pick.element)
    if (!player) {
      return []
    }

    const eventPoints = pointsByElement.has(pick.element)
      ? (pointsByElement.get(pick.element) ?? 0)
      : null

    return [
      {
        pick,
        player,
        overall: ratingsById.get(player.id)?.overall ?? null,
        eventPoints,
      },
    ]
  })
}

export function groupSlotsByPitchLine(slots: readonly SquadSlot[]): SquadLine[] {
  return PITCH_LINE_ORDER.flatMap((type) => {
    const lineSlots = slots.filter((slot) => slot.player.element_type === type)
    if (lineSlots.length === 0) {
      return []
    }
    return [{ type, slots: lineSlots }]
  })
}
