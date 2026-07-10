import { describe, expect, it } from "vitest"

import type { FplEvent } from "@/lib/fpl/types"
import {
  getSeasonLabel,
  marginToNext,
  medalForRank,
} from "@/lib/trophies/season"

function event(deadline_time: string): FplEvent {
  return {
    id: 1,
    name: "Gameweek 1",
    deadline_time,
    finished: false,
    is_current: false,
    is_next: false,
    data_checked: false,
    average_entry_score: 0,
  }
}

describe("getSeasonLabel", () => {
  it("uses the August start year for a normal FPL season", () => {
    expect(getSeasonLabel([event("2025-08-15T17:30:00Z")])).toBe("2025/26")
  })

  it("rolls back when the first deadline falls before July", () => {
    expect(getSeasonLabel([event("2026-05-20T17:30:00Z")])).toBe("2025/26")
  })
})

describe("medalForRank", () => {
  it("maps podium ranks", () => {
    expect(medalForRank(1)).toBe("gold")
    expect(medalForRank(2)).toBe("silver")
    expect(medalForRank(3)).toBe("bronze")
  })
})

describe("marginToNext", () => {
  it("returns the points gap to the next rank", () => {
    expect(marginToNext(2400, 2350)).toBe(50)
  })

  it("returns 0 when there is no next rank", () => {
    expect(marginToNext(100, undefined)).toBe(0)
  })
})
