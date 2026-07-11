import { describe, expect, it } from "vitest"

import type { FplElement } from "@/lib/fpl/types"
import type { ScoutPreset } from "@/lib/scouts/presets"
import {
  filterPlayersForScout,
  getScoutCardScore,
  sortPlayersForScout,
} from "@/lib/scouts/sort"

function makeElement(
  overrides: Partial<FplElement> &
    Pick<FplElement, "id" | "element_type" | "web_name">
): FplElement {
  return {
    code: overrides.id * 1000,
    team: 1,
    now_cost: 100,
    form: "5.0",
    total_points: 0,
    bonus: 0,
    defensive_contribution: 0,
    goals_scored: 0,
    assists: 0,
    minutes: 2000,
    starts: 20,
    selected_by_percent: "10.0",
    status: "a",
    ...overrides,
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
  slug: "bonus-hunters",
  name: "Bonus Hunters",
  subtitle: "BPS magnets",
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

const differentialsScout: ScoutPreset = {
  slug: "differentials",
  name: "Differentials",
  subtitle: "Under 10% owned",
  positionFilter: "all",
  sort: "overall",
  maxOwnership: 10,
}

const budgetScout: ScoutPreset = {
  slug: "budget-gems",
  name: "Budget Gems",
  subtitle: "Best under £6.0m",
  positionFilter: "all",
  sort: "overall",
  maxPriceMillions: 6,
}

const superSubsScout: ScoutPreset = {
  slug: "super-subs",
  name: "Super Subs",
  subtitle: "Impact off the bench",
  positionFilter: "all",
  sort: "gi_per_90",
  maxMinutes: 1200,
  maxStarts: 12,
  minGoalInvolvements: 3,
}

const defconScout: ScoutPreset = {
  slug: "defcon-giants",
  name: "Defcon Giants",
  subtitle: "Defensive contribution",
  positionFilter: "all",
  sort: "defcon",
  minDefensiveContribution: 1,
}

describe("sortPlayersForScout", () => {
  const players = [
    makeElement({
      id: 1,
      element_type: 4,
      web_name: "Alpha",
      total_points: 200,
      bonus: 10,
    }),
    makeElement({
      id: 2,
      element_type: 4,
      web_name: "Beta",
      total_points: 180,
      bonus: 20,
    }),
    makeElement({
      id: 3,
      element_type: 3,
      web_name: "Gamma",
      total_points: 220,
      bonus: 5,
    }),
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

  it("sorts by defensive contribution", () => {
    const defconPlayers = [
      makeElement({
        id: 1,
        element_type: 2,
        web_name: "Low",
        defensive_contribution: 40,
        total_points: 200,
      }),
      makeElement({
        id: 2,
        element_type: 2,
        web_name: "High",
        defensive_contribution: 120,
        total_points: 80,
      }),
      makeElement({
        id: 3,
        element_type: 4,
        web_name: "None",
        defensive_contribution: 0,
        total_points: 239,
      }),
    ]
    const sorted = sortPlayersForScout(defconPlayers, defconScout)
    expect(sorted.map((player) => player.id)).toEqual([2, 1])
  })
})

describe("filterPlayersForScout", () => {
  it("keeps differentials under the ownership cap", () => {
    const players = [
      makeElement({
        id: 1,
        element_type: 4,
        web_name: "Diff",
        selected_by_percent: "4.2",
      }),
      makeElement({
        id: 2,
        element_type: 4,
        web_name: "Template",
        selected_by_percent: "42.0",
      }),
    ]
    expect(filterPlayersForScout(players, differentialsScout).map((p) => p.id)).toEqual([
      1,
    ])
  })

  it("keeps budget gems under £6.0m", () => {
    const players = [
      makeElement({
        id: 1,
        element_type: 3,
        web_name: "Cheap",
        now_cost: 55,
      }),
      makeElement({
        id: 2,
        element_type: 3,
        web_name: "Premium",
        now_cost: 80,
      }),
      makeElement({
        id: 3,
        element_type: 3,
        web_name: "Boundary",
        now_cost: 60,
      }),
    ]
    expect(filterPlayersForScout(players, budgetScout).map((p) => p.id)).toEqual([
      1, 3,
    ])
  })

  it("keeps super subs with low minutes/starts and enough involvements", () => {
    const players = [
      makeElement({
        id: 1,
        element_type: 4,
        web_name: "Impact",
        minutes: 600,
        starts: 4,
        goals_scored: 4,
        assists: 1,
      }),
      makeElement({
        id: 2,
        element_type: 4,
        web_name: "Starter",
        minutes: 2800,
        starts: 30,
        goals_scored: 12,
        assists: 5,
      }),
      makeElement({
        id: 3,
        element_type: 4,
        web_name: "Quiet",
        minutes: 400,
        starts: 2,
        goals_scored: 1,
        assists: 0,
      }),
    ]
    const filtered = filterPlayersForScout(players, superSubsScout)
    expect(filtered.map((p) => p.id)).toEqual([1])

    const sorted = sortPlayersForScout(players, superSubsScout)
    expect(sorted.map((p) => p.id)).toEqual([1])
    expect(getScoutCardScore(sorted[0]!, superSubsScout)).toBeNull()
  })
})

describe("getScoutCardScore", () => {
  it("always returns overall rating when available", () => {
    const player = makeElement({
      id: 1,
      element_type: 4,
      web_name: "Alpha",
      bonus: 99,
      defensive_contribution: 500,
    })
    const ratingsById = new Map([[1, { id: 1, overall: 88 } as never]])

    expect(getScoutCardScore(player, bonusScout, ratingsById)).toBe(88)
    expect(getScoutCardScore(player, defconScout, ratingsById)).toBe(88)
  })
})
