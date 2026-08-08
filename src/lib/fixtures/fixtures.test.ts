import { describe, expect, it } from "vitest"

import { projectBonus } from "@/lib/fixtures/events"
import { getGameweekShape } from "@/lib/fixtures/gameweek-shape"
import { getFixturePhase, getTeamRecentForm, getTeamRecord, formatTeamRecord } from "@/lib/fixtures/form"
import { groupFixturesByDay, getEventFixtures } from "@/lib/fixtures/group"
import { formatFixtureKickoff, formatMatchKickoffTitle, formatMatchSheetTitle } from "@/lib/fixtures/kickoff"
import {
  getFixturePointsByElement,
  isBonusAddedForEvent,
} from "@/lib/fixtures/live"
import type { FplEventLive, FplFixture, FplTeam } from "@/lib/fpl/types"

function fixture(partial: Partial<FplFixture> & Pick<FplFixture, "id">): FplFixture {
  return {
    code: partial.id,
    event: 1,
    team_h: 1,
    team_a: 2,
    team_h_score: null,
    team_a_score: null,
    team_h_difficulty: 3,
    team_a_difficulty: 3,
    kickoff_time: "2026-08-15T14:00:00Z",
    finished: false,
    finished_provisional: false,
    started: false,
    minutes: 0,
    provisional_start_time: false,
    stats: [],
    ...partial,
  }
}

const teams: FplTeam[] = Array.from({ length: 4 }, (_, index) => ({
  id: index + 1,
  code: index + 1,
  name: `Team ${index + 1}`,
  short_name: `T${index + 1}`,
}))

describe("formatFixtureKickoff", () => {
  it("returns TBC when kickoff is missing", () => {
    expect(formatFixtureKickoff(null)).toBe("TBC")
  })

  it("formats time only by default", () => {
    expect(formatFixtureKickoff("2026-08-15T14:00:00Z", { locale: "en-GB" })).toBe(
      "14:00"
    )
  })

  it("includes a short weekday when requested", () => {
    expect(
      formatFixtureKickoff("2026-08-15T14:00:00Z", {
        includeWeekday: true,
        locale: "en-GB",
      })
    ).toBe("Sat 14:00")
  })
})

describe("formatMatchKickoffTitle", () => {
  it("formats a pundit-style kickoff title", () => {
    const label = formatMatchKickoffTitle("2026-08-22T11:30:00Z", "en-GB")
    expect(label).toMatch(/^Sat 22 Aug at \d{1,2}:\d{2}$/)
  })

  it("returns Kickoff TBC when missing", () => {
    expect(formatMatchKickoffTitle(null)).toBe("Kickoff TBC")
  })
})

describe("formatMatchSheetTitle", () => {
  it("uses kickoff for pre-match and status once underway", () => {
    expect(
      formatMatchSheetTitle(
        fixture({ id: 1, kickoff_time: "2026-08-22T11:30:00Z" })
      )
    ).toContain("at")
    expect(
      formatMatchSheetTitle(fixture({ id: 2, started: true, minutes: 67 }))
    ).toBe("Live 67'")
    expect(
      formatMatchSheetTitle(
        fixture({ id: 3, finished: true, started: true, minutes: 90 })
      )
    ).toBe("Full time")
  })
})

describe("groupFixturesByDay", () => {
  it("groups fixtures by kickoff calendar day and sorts chronologically", () => {
    const fixtures = [
      fixture({
        id: 2,
        kickoff_time: "2026-08-16T16:30:00Z",
      }),
      fixture({
        id: 1,
        kickoff_time: "2026-08-15T14:00:00Z",
      }),
      fixture({
        id: 3,
        kickoff_time: "2026-08-15T16:30:00Z",
      }),
    ]

    const groups = groupFixturesByDay(fixtures, "en-GB")

    expect(groups).toHaveLength(2)
    expect(groups[0]!.fixtures.map((entry) => entry.id)).toEqual([1, 3])
    expect(groups[1]!.fixtures.map((entry) => entry.id)).toEqual([2])
  })

  it("filters event fixtures", () => {
    const fixtures = [
      fixture({ id: 1, event: 1 }),
      fixture({ id: 2, event: 2 }),
      fixture({ id: 3, event: 1 }),
    ]

    expect(getEventFixtures(fixtures, 1).map((entry) => entry.id)).toEqual([
      1, 3,
    ])
  })
})

describe("getGameweekShape", () => {
  it("flags blank and double gameweeks from fixture counts", () => {
    const fixtures = [
      fixture({ id: 1, event: 5, team_h: 1, team_a: 2 }),
      fixture({ id: 2, event: 5, team_h: 1, team_a: 3 }),
    ]

    const shape = getGameweekShape(5, fixtures, teams)

    expect(shape.isDouble).toBe(true)
    expect(shape.isBlank).toBe(true)
    expect(shape.doubleTeams.map((team) => team.id)).toEqual([1])
    expect(shape.blankTeams.map((team) => team.id)).toEqual([4])
  })

  it("returns a normal week when every team plays once", () => {
    const fixtures = [
      fixture({ id: 1, event: 1, team_h: 1, team_a: 2 }),
      fixture({ id: 2, event: 1, team_h: 3, team_a: 4 }),
    ]

    const shape = getGameweekShape(1, fixtures, teams)

    expect(shape.isBlank).toBe(false)
    expect(shape.isDouble).toBe(false)
  })
})

describe("projectBonus", () => {
  it("awards 3/2/1 for distinct top BPS", () => {
    const bonus = projectBonus([
      { element: 1, bps: 40 },
      { element: 2, bps: 30 },
      { element: 3, bps: 20 },
      { element: 4, bps: 10 },
    ])

    expect(bonus.get(1)).toBe(3)
    expect(bonus.get(2)).toBe(2)
    expect(bonus.get(3)).toBe(1)
    expect(bonus.has(4)).toBe(false)
  })

  it("shares top bonus and skips the next place on a BPS tie", () => {
    const bonus = projectBonus([
      { element: 1, bps: 40 },
      { element: 2, bps: 40 },
      { element: 3, bps: 20 },
    ])

    expect(bonus.get(1)).toBe(3)
    expect(bonus.get(2)).toBe(3)
    expect(bonus.get(3)).toBe(1)
  })
})

describe("form helpers", () => {
  it("derives recent form from finished fixtures", () => {
    const fixtures = [
      fixture({
        id: 1,
        team_h: 1,
        team_a: 2,
        team_h_score: 2,
        team_a_score: 0,
        finished: true,
        kickoff_time: "2026-08-01T14:00:00Z",
      }),
      fixture({
        id: 2,
        team_h: 3,
        team_a: 1,
        team_h_score: 1,
        team_a_score: 1,
        finished: true,
        kickoff_time: "2026-08-08T14:00:00Z",
      }),
    ]

    const teamsById = new Map(teams.map((team) => [team.id, team]))
    const form = getTeamRecentForm(1, fixtures, teamsById)

    expect(form.map((entry) => entry.result)).toEqual(["D", "W"])
  })

  it("aggregates season W-D-L records", () => {
    const fixtures = [
      fixture({
        id: 1,
        finished: true,
        team_h: 1,
        team_a: 2,
        team_h_score: 2,
        team_a_score: 0,
      }),
      fixture({
        id: 2,
        finished: true,
        team_h: 3,
        team_a: 1,
        team_h_score: 1,
        team_a_score: 1,
      }),
      fixture({
        id: 3,
        finished: true,
        team_h: 1,
        team_a: 4,
        team_h_score: 0,
        team_a_score: 3,
      }),
      fixture({
        id: 4,
        finished: false,
        team_h: 1,
        team_a: 2,
        team_h_score: null,
        team_a_score: null,
      }),
    ]

    const record = getTeamRecord(1, fixtures)
    expect(record).toEqual({ wins: 1, draws: 1, losses: 1, played: 3 })
    expect(formatTeamRecord(record)).toBe("1-1-1")
  })

  it("resolves fixture phase", () => {
    expect(getFixturePhase(fixture({ id: 1 }))).toBe("pre-match")
    expect(getFixturePhase(fixture({ id: 2, started: true }))).toBe("live")
    expect(
      getFixturePhase(fixture({ id: 3, finished: true, started: true }))
    ).toBe("finished")
  })
})

describe("live helpers", () => {
  it("attributes points from explain[].fixture", () => {
    const live: FplEventLive = {
      elements: [
        {
          id: 10,
          stats: {
            minutes: 90,
            goals_scored: 1,
            assists: 0,
            bonus: 0,
            bps: 30,
            defensive_contribution: 0,
            total_points: 8,
          },
          explain: [
            {
              fixture: 100,
              stats: [
                { identifier: "minutes", points: 2, value: 90 },
                { identifier: "goals_scored", points: 6, value: 1 },
              ],
            },
            {
              fixture: 101,
              stats: [{ identifier: "minutes", points: 1, value: 45 }],
            },
          ],
        },
      ],
    }

    const for100 = getFixturePointsByElement(live, 100)
    expect(for100.get(10)?.totalPoints).toBe(8)

    const for101 = getFixturePointsByElement(live, 101)
    expect(for101.get(10)?.totalPoints).toBe(1)
  })

  it("requires every status day for an event to have bonus_added", () => {
    expect(
      isBonusAddedForEvent(
        [
          { event: 1, bonus_added: true },
          { event: 1, bonus_added: false },
        ],
        1
      )
    ).toBe(false)

    expect(
      isBonusAddedForEvent(
        [
          { event: 1, bonus_added: true },
          { event: 1, bonus_added: true },
        ],
        1
      )
    ).toBe(true)
  })
})
