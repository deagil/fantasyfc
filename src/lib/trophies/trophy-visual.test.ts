import { describe, expect, it } from "vitest"

import {
  hashLeagueId,
  resolveTrophyParts,
  trophyBaseIds,
  trophyBodyIds,
  trophyHandlesIds,
  trophyStemIds,
} from "@/lib/trophies/trophy-visual"

describe("hashLeagueId", () => {
  it("returns a stable hash for the same league id", () => {
    expect(hashLeagueId(12345)).toBe(hashLeagueId(12345))
    expect(hashLeagueId(999)).not.toBe(hashLeagueId(1000))
  })
})

describe("resolveTrophyParts", () => {
  it("returns the same parts for the same league id", () => {
    const first = resolveTrophyParts(314159)
    const second = resolveTrophyParts(314159)

    expect(second).toEqual(first)
  })

  it("returns only known part ids", () => {
    const parts = resolveTrophyParts(42)

    expect(trophyBodyIds).toContain(parts.body)
    expect(trophyHandlesIds).toContain(parts.handles)
    expect(trophyStemIds).toContain(parts.stem)
    expect(trophyBaseIds).toContain(parts.base)
  })

  it("usually differs across league ids", () => {
    const samples = [1, 2, 3, 7, 11, 19, 23, 29, 31, 37].map(resolveTrophyParts)
    const unique = new Set(samples.map((parts) => JSON.stringify(parts)))

    expect(unique.size).toBeGreaterThan(1)
  })
})
