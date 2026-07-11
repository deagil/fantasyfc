import { describe, expect, it } from "vitest"

import {
  csvToRecords,
  mapPlayersRaw,
  parseCsv,
  playersRawUrl,
  previousSeasons,
} from "@/lib/ratings/vaastav"

describe("previousSeasons", () => {
  it("returns the 3 seasons before the current one, newest first", () => {
    expect(previousSeasons(2026)).toEqual([
      { dir: "2025-26", name: "2025/26" },
      { dir: "2024-25", name: "2024/25" },
      { dir: "2023-24", name: "2023/24" },
    ])
  })

  it("handles the century rollover in the suffix", () => {
    expect(previousSeasons(2100, 1)).toEqual([
      { dir: "2099-00", name: "2099/00" },
    ])
  })

  it("builds raw.githubusercontent URLs", () => {
    expect(playersRawUrl({ dir: "2024-25", name: "2024/25" })).toBe(
      "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2024-25/players_raw.csv"
    )
  })
})

describe("parseCsv", () => {
  it("handles quoted fields containing commas, quotes, and newlines", () => {
    const text =
      'a,b,c\n1,"hello, world","say ""hi"""\n2,"multi\nline",plain\n'
    expect(parseCsv(text)).toEqual([
      ["a", "b", "c"],
      ["1", "hello, world", 'say "hi"'],
      ["2", "multi\nline", "plain"],
    ])
  })

  it("handles CRLF line endings and trailing newline", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ])
  })

  it("maps records by header", () => {
    expect(csvToRecords("x,y\n1,2\n3,4")).toEqual([
      { x: "1", y: "2" },
      { x: "3", y: "4" },
    ])
  })
})

describe("mapPlayersRaw", () => {
  const baseRecord = {
    code: "226597",
    element_type: "2",
    web_name: "Gabriel",
    now_cost: "72",
    cost_change_start: "12",
    total_points: "164",
    minutes: "2075",
    goals_scored: "3",
    assists: "4",
    clean_sheets: "13",
    goals_conceded: "15",
    own_goals: "0",
    penalties_saved: "0",
    penalties_missed: "0",
    yellow_cards: "3",
    red_cards: "0",
    saves: "0",
    bonus: "24",
    bps: "563",
    influence: "665.6",
    creativity: "105.4",
    threat: "196.0",
    ict_index: "96.5",
    clearances_blocks_interceptions: "183",
    recoveries: "44",
    tackles: "31",
    defensive_contribution: "214",
    starts: "23",
    expected_goals: "1.87",
    expected_assists: "1.59",
    expected_goal_involvements: "3.46",
    expected_goals_conceded: "14.77",
  }

  it("maps a row into history_past shape", () => {
    const [input] = mapPlayersRaw([baseRecord], "2025/26")
    expect(input.playerCode).toBe(226597)
    expect(input.elementType).toBe(2)
    expect(input.seasonName).toBe("2025/26")
    expect(input.stats.start_cost).toBe(60) // now_cost - cost_change_start
    expect(input.stats.end_cost).toBe(72)
    expect(input.stats.total_points).toBe(164)
    expect(input.stats.expected_goals).toBe("1.87")
    expect(input.stats.defensive_contribution).toBe(214)
  })

  it("defaults missing columns (older seasons) to zero", () => {
    const record = { ...baseRecord }
    delete (record as Record<string, string>).defensive_contribution
    delete (record as Record<string, string>).recoveries
    const [input] = mapPlayersRaw([record], "2023/24")
    expect(input.stats.defensive_contribution).toBe(0)
    expect(input.stats.recoveries).toBe(0)
  })

  it("treats 'None' values as zero", () => {
    const [input] = mapPlayersRaw(
      [{ ...baseRecord, penalties_saved: "None" }],
      "2024/25"
    )
    expect(input.stats.penalties_saved).toBe(0)
  })

  it("excludes assistant managers and invalid codes", () => {
    const manager = { ...baseRecord, element_type: "5" }
    const noCode = { ...baseRecord, code: "0" }
    expect(mapPlayersRaw([manager, noCode], "2024/25")).toHaveLength(0)
  })
})
