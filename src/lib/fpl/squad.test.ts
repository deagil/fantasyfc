import { describe, expect, it } from "vitest"

import type { FplElement, FplPick } from "@/lib/fpl/types"
import {
  buildLivePointsByElement,
  buildSquadSlots,
  getAppliedPoints,
  getChipLabel,
  getFormation,
  groupSlotsByPitchLine,
  splitPicks,
  sumAppliedPoints,
} from "@/lib/fpl/squad"

function pick(
  partial: Pick<FplPick, "element" | "position" | "element_type"> &
    Partial<FplPick>
): FplPick {
  return {
    multiplier: 1,
    is_captain: false,
    is_vice_captain: false,
    ...partial,
  }
}

function element(id: number, type: FplElement["element_type"]): FplElement {
  return {
    id,
    code: id,
    web_name: `P${id}`,
    first_name: "P",
    second_name: String(id),
    team: 1,
    element_type: type,
    now_cost: 50,
    form: "0.0",
    points_per_game: "0.0",
    total_points: 0,
    bonus: 0,
    defensive_contribution: 0,
    goals_scored: 0,
    assists: 0,
    minutes: 0,
    starts: 0,
    selected_by_percent: "0.0",
    status: "a",
    news: "",
    chance_of_playing_next_round: null,
  }
}

const formation343: FplPick[] = [
  pick({ element: 1, position: 1, element_type: 1 }),
  pick({ element: 2, position: 2, element_type: 2 }),
  pick({ element: 3, position: 3, element_type: 2 }),
  pick({ element: 4, position: 4, element_type: 2 }),
  pick({ element: 5, position: 5, element_type: 3 }),
  pick({ element: 6, position: 6, element_type: 3 }),
  pick({ element: 7, position: 7, element_type: 3 }),
  pick({ element: 8, position: 8, element_type: 3 }),
  pick({ element: 9, position: 9, element_type: 4 }),
  pick({ element: 10, position: 10, element_type: 4 }),
  pick({
    element: 11,
    position: 11,
    element_type: 4,
    is_captain: true,
    multiplier: 2,
  }),
  pick({ element: 12, position: 12, element_type: 1, multiplier: 0 }),
  pick({ element: 13, position: 13, element_type: 2, multiplier: 0 }),
  pick({ element: 14, position: 14, element_type: 3, multiplier: 0 }),
  pick({ element: 15, position: 15, element_type: 4, multiplier: 0 }),
]

describe("splitPicks", () => {
  it("puts positions 1–11 on the pitch and 12–15 on the bench", () => {
    const { starting, bench } = splitPicks(formation343)
    expect(starting.map((item) => item.position)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ])
    expect(bench.map((item) => item.position)).toEqual([12, 13, 14, 15])
  })

  it("keeps bench players on the bench when Bench Boost sets multipliers", () => {
    const boosted = formation343.map((item) => ({
      ...item,
      multiplier: item.position >= 12 ? 1 : item.multiplier,
    }))
    const { starting, bench } = splitPicks(boosted)
    expect(starting).toHaveLength(11)
    expect(bench).toHaveLength(4)
  })
})

describe("getFormation", () => {
  it("reads DEF-MID-FWD from the starting eleven", () => {
    expect(getFormation(splitPicks(formation343).starting)).toBe("3-4-3")
  })

  it("handles a five-at-the-back", () => {
    const starting = [
      pick({ element: 1, position: 1, element_type: 1 }),
      pick({ element: 2, position: 2, element_type: 2 }),
      pick({ element: 3, position: 3, element_type: 2 }),
      pick({ element: 4, position: 4, element_type: 2 }),
      pick({ element: 5, position: 5, element_type: 2 }),
      pick({ element: 6, position: 6, element_type: 2 }),
      pick({ element: 7, position: 7, element_type: 3 }),
      pick({ element: 8, position: 8, element_type: 3 }),
      pick({ element: 9, position: 9, element_type: 4 }),
      pick({ element: 10, position: 10, element_type: 4 }),
      pick({ element: 11, position: 11, element_type: 4 }),
    ]
    expect(getFormation(starting)).toBe("5-2-3")
  })
})

describe("getChipLabel", () => {
  it("maps FPL chip ids to display names", () => {
    expect(getChipLabel("bboost")).toBe("Bench Boost")
    expect(getChipLabel("3xc")).toBe("Triple Captain")
    expect(getChipLabel("freehit")).toBe("Free Hit")
    expect(getChipLabel("wildcard")).toBe("Wildcard")
  })

  it("returns null when no chip is active", () => {
    expect(getChipLabel(null)).toBeNull()
    expect(getChipLabel("")).toBeNull()
  })
})

describe("points", () => {
  it("applies the captain multiplier", () => {
    const captain = pick({
      element: 11,
      position: 11,
      element_type: 4,
      is_captain: true,
      multiplier: 2,
    })
    expect(getAppliedPoints(captain, 8)).toBe(16)
  })

  it("treats a benched player as zero applied points", () => {
    const benched = pick({
      element: 12,
      position: 12,
      element_type: 1,
      multiplier: 0,
    })
    expect(getAppliedPoints(benched, 6)).toBe(0)
  })

  it("sums applied points across the squad", () => {
    const pointsByElement = buildLivePointsByElement([
      { id: 1, stats: { total_points: 2 } },
      { id: 11, stats: { total_points: 8 } },
      { id: 12, stats: { total_points: 6 } },
    ])
    expect(sumAppliedPoints(formation343, pointsByElement)).toBe(2 + 16)
  })
})

describe("pitch lines", () => {
  it("orders lines FWD → MID → DEF → GK", () => {
    const elementsById = new Map(
      Array.from({ length: 11 }, (_, index) => {
        const id = index + 1
        const type = formation343[index]?.element_type ?? 1
        return [id, element(id, type as FplElement["element_type"])] as const
      })
    )
    const slots = buildSquadSlots(
      splitPicks(formation343).starting,
      elementsById,
      new Map(),
      new Map()
    )
    expect(groupSlotsByPitchLine(slots).map((line) => line.type)).toEqual([
      4, 3, 2, 1,
    ])
    expect(
      groupSlotsByPitchLine(slots).map((line) => line.slots.length)
    ).toEqual([3, 4, 3, 1])
  })

  it("copies live points and minutes onto each slot", () => {
    const elementsById = new Map([[1, element(1, 1)]])
    const slots = buildSquadSlots(
      [pick({ element: 1, position: 1, element_type: 1 })],
      elementsById,
      new Map(),
      new Map([[1, { points: 0, minutes: 67 }]])
    )
    expect(slots[0]?.eventPoints).toBe(0)
    expect(slots[0]?.eventMinutes).toBe(67)
  })
})
