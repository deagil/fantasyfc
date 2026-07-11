import { describe, expect, it } from "vitest"

import type { FplElement } from "@/lib/fpl/types"
import type { ScoutPreset } from "@/lib/scouts/presets"
import { sortPlayersForScout } from "@/lib/scouts/sort"

function makeElement(
  id: number,
  elementType: 1 | 2 | 3 | 4,
  totalPoints: number,
  bonus: number,
  webName: string
): FplElement {
  return {
    id,
    web_name: webName,
    element_type: elementType,
    total_points: totalPoints,
    bonus,
    team: 1,
    now_cost: 100,
    form: "5.0",
    selected_by_percent: "10.0",
    status: "a",
  }
}

const pointsScout: ScoutPreset = {
  slug: "forwards",
  name: "Forwards",
  subtitle: "Attacking options",
  positionFilter: "FWD",
  sort: "points",
}

const bonusScout: ScoutPreset = {
  slug: "most-bonus",
  name: "Most bonus",
  subtitle: "Bonus point hunters",
  positionFilter: "all",
  sort: "bonus",
}

const overallScout: ScoutPreset = {
  slug: "any-position",
  name: "Any Position",
  subtitle: "First team quality",
  positionFilter: "all",
  sort: "overall",
}

describe("sortPlayersForScout", () => {
  const players = [
    makeElement(1, 4, 200, 10, "Alpha"),
    makeElement(2, 4, 180, 20, "Beta"),
    makeElement(3, 3, 220, 5, "Gamma"),
  ]

  it("sorts by total points", () => {
    const sorted = sortPlayersForScout(players, pointsScout)
    expect(sorted.map((player) => player.id)).toEqual([1, 2])
  })

  it("sorts by bonus then points", () => {
    const sorted = sortPlayersForScout(players, bonusScout)
    expect(sorted.map((player) => player.id)).toEqual([2, 1, 3])
  })

  it("sorts by overall rating when ratings are provided", () => {
    const ratingsById = new Map([
      [1, { id: 1, overall: 70 } as never],
      [2, { id: 2, overall: 90 } as never],
      [3, { id: 3, overall: 80 } as never],
    ])

    const sorted = sortPlayersForScout(players, overallScout, ratingsById)
    expect(sorted.map((player) => player.id)).toEqual([2, 3, 1])
  })
})
