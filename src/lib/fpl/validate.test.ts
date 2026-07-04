import { describe, expect, it } from "vitest"

import {
  parseEventId,
  parseLeagueId,
  parseOptionalEventId,
  parseStandingsPage,
  parseTeamId,
} from "@/lib/fpl/validate"

describe("parseTeamId", () => {
  it("accepts positive integers", () => {
    expect(parseTeamId(123)).toBe(123)
    expect(parseTeamId("456")).toBe(456)
  })

  it("rejects invalid values", () => {
    expect(() => parseTeamId(0)).toThrow("Invalid teamId")
    expect(() => parseTeamId("all")).toThrow("Invalid teamId")
    expect(() => parseTeamId(-1)).toThrow("Invalid teamId")
  })
})

describe("parseOptionalEventId", () => {
  it("returns undefined for missing values", () => {
    expect(parseOptionalEventId(undefined)).toBeUndefined()
    expect(parseOptionalEventId(null)).toBeUndefined()
  })

  it("parses valid event ids", () => {
    expect(parseOptionalEventId(12)).toBe(12)
  })
})

describe("parseStandingsPage", () => {
  it("defaults to page 1", () => {
    expect(parseStandingsPage(undefined)).toBe(1)
  })

  it("parses explicit pages", () => {
    expect(parseStandingsPage(2)).toBe(2)
  })
})

describe("parseLeagueId", () => {
  it("parses league ids", () => {
    expect(parseLeagueId(314)).toBe(314)
  })
})

describe("parseEventId", () => {
  it("parses event ids", () => {
    expect(parseEventId(38)).toBe(38)
  })
})
