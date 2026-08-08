import { describe, expect, it } from "vitest"

import {
  describeFixtureDifficulty,
  describeFixtureRunDifficulty,
  describeMatchAssetOutlook,
  getNextUnfinishedEvent,
  getUpcomingTeamFixtures,
} from "@/lib/fixtures/upcoming"
import type { FplFixture, FplTeam } from "@/lib/fpl/types"

const teams: FplTeam[] = [
  { id: 1, code: 11, name: "Arsenal", short_name: "ARS" },
  { id: 2, code: 22, name: "Brentford", short_name: "BRE" },
  { id: 3, code: 33, name: "Chelsea", short_name: "CHE" },
]

const teamsById = new Map(teams.map((team) => [team.id, team]))

function makeFixture(overrides: Partial<FplFixture> & Pick<FplFixture, "id" | "event" | "team_h" | "team_a">): FplFixture {
  return {
    code: overrides.id * 10,
    team_h_score: null,
    team_a_score: null,
    team_h_difficulty: 3,
    team_a_difficulty: 3,
    kickoff_time: null,
    finished: false,
    finished_provisional: false,
    started: false,
    minutes: 0,
    provisional_start_time: false,
    stats: [],
    ...overrides,
  }
}

describe("getNextUnfinishedEvent", () => {
  it("returns the lowest event with an unfinished fixture", () => {
    const fixtures = [
      makeFixture({ id: 1, event: 5, team_h: 1, team_a: 2, finished: true }),
      makeFixture({ id: 2, event: 7, team_h: 1, team_a: 3 }),
      makeFixture({ id: 3, event: 6, team_h: 2, team_a: 3 }),
    ]

    expect(getNextUnfinishedEvent(fixtures)).toBe(6)
  })

  it("returns null when the season is complete", () => {
    const fixtures = [
      makeFixture({ id: 1, event: 38, team_h: 1, team_a: 2, finished: true }),
    ]

    expect(getNextUnfinishedEvent(fixtures)).toBeNull()
  })
})

describe("getUpcomingTeamFixtures", () => {
  const fixtures = [
    // GW6: single home game, easy.
    makeFixture({
      id: 1,
      event: 6,
      team_h: 1,
      team_a: 2,
      team_h_difficulty: 2,
      team_a_difficulty: 4,
    }),
    // GW7: nothing for team 1 — a blank.
    makeFixture({ id: 2, event: 7, team_h: 2, team_a: 3 }),
    // GW8: two games for team 1 — a double.
    makeFixture({
      id: 3,
      event: 8,
      team_h: 3,
      team_a: 1,
      team_h_difficulty: 2,
      team_a_difficulty: 5,
    }),
    makeFixture({
      id: 4,
      event: 8,
      team_h: 1,
      team_a: 3,
      team_h_difficulty: 4,
      team_a_difficulty: 3,
    }),
  ]

  it("returns one entry per gameweek including blanks", () => {
    const run = getUpcomingTeamFixtures(1, fixtures, teamsById, {
      fromEvent: 6,
      eventCount: 3,
    })

    expect(run.events.map((entry) => entry.event)).toEqual([6, 7, 8])
    expect(run.events[1].fixtures).toEqual([])
    expect(run.blankCount).toBe(1)
    expect(run.doubleCount).toBe(1)
    expect(run.fixtureCount).toBe(3)
  })

  it("reads difficulty and venue from the requested team's perspective", () => {
    const run = getUpcomingTeamFixtures(1, fixtures, teamsById, {
      fromEvent: 6,
      eventCount: 1,
    })

    expect(run.events[0].fixtures[0]).toMatchObject({
      opponentShort: "BRE",
      isHome: true,
      difficulty: 2,
    })
  })

  it("averages difficulty across every fixture, not every gameweek", () => {
    const run = getUpcomingTeamFixtures(1, fixtures, teamsById, {
      fromEvent: 6,
      eventCount: 3,
    })

    // Home vs BRE (2), away at CHE (5), home vs CHE (4).
    expect(run.averageDifficulty).toBeCloseTo(11 / 3)
  })

  it("reports a null average when every gameweek is blank", () => {
    const run = getUpcomingTeamFixtures(1, fixtures, teamsById, {
      fromEvent: 20,
      eventCount: 3,
    })

    expect(run.averageDifficulty).toBeNull()
    expect(run.blankCount).toBe(3)
  })
})

describe("describeFixtureDifficulty", () => {
  it("uses stronger labels at the FDR extremes", () => {
    expect(describeFixtureDifficulty(1)).toBe("favourite")
    expect(describeFixtureDifficulty(2)).toBe("easier")
    expect(describeFixtureDifficulty(3)).toBe("average")
    expect(describeFixtureDifficulty(4)).toBe("harder")
    expect(describeFixtureDifficulty(5)).toBe("tough")
  })
})

describe("describeMatchAssetOutlook", () => {
  const teams = { homeName: "Man Utd", awayName: "Hull City" }

  it("compares the FDR gap so Average vs Tough favours the easier side", () => {
    expect(describeMatchAssetOutlook(3, 5, teams)).toEqual({
      id: "home_favoured",
      label: "Advantage Man Utd",
    })
    expect(describeMatchAssetOutlook(5, 3, teams)).toEqual({
      id: "away_favoured",
      label: "Advantage Hull City",
    })
  })

  it("uses stronger wording for a wide gap", () => {
    expect(describeMatchAssetOutlook(2, 5, teams)).toEqual({
      id: "home_favoured",
      label: "Big advantage Man Utd",
    })
    expect(describeMatchAssetOutlook(5, 1, teams)).toEqual({
      id: "away_favoured",
      label: "Big advantage Hull City",
    })
  })

  it("describes balanced and mutual cases in pundit language", () => {
    expect(describeMatchAssetOutlook(4, 4, teams)).toEqual({
      id: "both_tough",
      label: "Cagey affair",
    })
    expect(describeMatchAssetOutlook(2, 2, teams)).toEqual({
      id: "both_open",
      label: "Could be open",
    })
    expect(describeMatchAssetOutlook(3, 3, teams)).toEqual({
      id: "competitive",
      label: "Anyone's game",
    })
    expect(describeMatchAssetOutlook(3, 4, teams)).toEqual({
      id: "competitive",
      label: "Anyone's game",
    })
  })
})

describe("describeFixtureRunDifficulty", () => {
  it("labels runs relative to a neutral FDR of 3", () => {
    expect(describeFixtureRunDifficulty(2.4)).toBe("easier")
    expect(describeFixtureRunDifficulty(3)).toBe("average")
    expect(describeFixtureRunDifficulty(3.2)).toBe("harder")
  })
})
