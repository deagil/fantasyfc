import { describe, expect, it } from "vitest"

import { blendRatings } from "@/lib/ratings/blend"
import {
  buildCalibrationMap,
  calibrateRatings,
  quantileSorted,
} from "@/lib/ratings/calibrate"
import { computeRatings } from "@/lib/ratings/engine"
import type { EnginePlayer, PlayerRatingResult } from "@/lib/ratings/model"

function makeResult(
  overrides: Partial<PlayerRatingResult>
): PlayerRatingResult {
  return {
    id: 1,
    code: 1,
    webName: "P",
    elementType: 3,
    minutes: 2000,
    status: "a",
    gamesPlayed: 22,
    damping: 1,
    unassessed: false,
    confidence: "high",
    overall: 50,
    currentOverall: 50,
    expectedOverall: null,
    performanceGap: null,
    trend: "no_baseline",
    categories: {},
    ...overrides,
  }
}

describe("buildCalibrationMap", () => {
  const cohort = Array.from({ length: 100 }, (_, i) => 30 + i * 0.55) // 30..84.45

  it("maps the cohort maximum to ~95 and stays monotone", () => {
    const map = buildCalibrationMap(cohort)!
    expect(map(84.45)).toBe(95)

    let previous = -Infinity
    for (let raw = 10; raw <= 100; raw += 1) {
      const value = map(raw)
      expect(value).toBeGreaterThanOrEqual(previous)
      expect(value).toBeGreaterThanOrEqual(10)
      expect(value).toBeLessThanOrEqual(100)
      previous = value
    }
  })

  it("stretches the top and keeps the median moderate", () => {
    const map = buildCalibrationMap(cohort)!
    const median = quantileSorted([...cohort].sort((a, b) => a - b), 0.5)
    expect(map(median)).toBeGreaterThanOrEqual(60)
    expect(map(median)).toBeLessThanOrEqual(70)
    // 95th percentile cohort member reaches the mid-to-high 80s.
    const p95 = quantileSorted([...cohort].sort((a, b) => a - b), 0.95)
    expect(map(p95)).toBeGreaterThanOrEqual(85)
  })

  it("returns null for cohorts too small to calibrate", () => {
    expect(buildCalibrationMap([50, 60, 70])).toBeNull()
  })

  it("collapses tied quantiles keeping the higher target", () => {
    // 96 identical scores + a few below: top anchors all tie at 80.
    const tied = [...Array.from({ length: 96 }, () => 80), 40, 45, 50, 55]
    const map = buildCalibrationMap(tied)!
    expect(map(80)).toBe(95)
  })
})

describe("calibrateRatings", () => {
  it("lifts the best player toward 95 and preserves order", () => {
    const results = Array.from({ length: 40 }, (_, i) =>
      makeResult({ id: i + 1, code: i + 1, overall: 45 + i, currentOverall: 45 + i })
    )
    const calibrated = calibrateRatings(results)
    const sorted = [...calibrated].sort((a, b) => b.overall - a.overall)
    expect(sorted[0].id).toBe(40)
    expect(sorted[0].overall).toBe(95)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].overall).toBeLessThanOrEqual(sorted[i - 1].overall)
    }
  })

  it("maps unassessed players through the cohort curve without joining it", () => {
    const cohort = Array.from({ length: 40 }, (_, i) =>
      makeResult({ id: i + 1, code: i + 1, overall: 55 + i })
    )
    const junior = makeResult({
      id: 99,
      code: 99,
      overall: 50,
      unassessed: true,
      damping: 0,
    })
    const calibrated = calibrateRatings([...cohort, junior])
    const juniorOut = calibrated.find((r) => r.id === 99)!
    const cohortBest = Math.max(
      ...calibrated.filter((r) => r.id !== 99).map((r) => r.overall)
    )
    expect(cohortBest).toBe(95)
    // Junior sits below the whole cohort, not inflated by rank.
    expect(juniorOut.overall).toBeLessThan(55)
  })

  it("recomputes the performance gap from calibrated values", () => {
    const results = Array.from({ length: 40 }, (_, i) =>
      makeResult({
        id: i + 1,
        code: i + 1,
        overall: 45 + i,
        currentOverall: 45 + i,
        expectedOverall: 45 + i - 4,
        performanceGap: 4,
      })
    )
    const calibrated = calibrateRatings(results)
    for (const result of calibrated) {
      expect(result.performanceGap).toBe(
        result.currentOverall - (result.expectedOverall ?? 0)
      )
    }
  })
})

describe("preseason blending", () => {
  function cohortPlayers(): EnginePlayer[] {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      code: 100 + i,
      webName: `P${i}`,
      elementType: 3 as const,
      minutes: 0,
      stats: { minutes: 0 },
    }))
  }

  it("reports preseason trend and no gap before a ball is kicked", () => {
    const ratings = computeRatings(cohortPlayers(), { event: 0 })
    const baselines = new Map([
      [100, { overall: 88, categories: {}, seasonsUsed: 3, latestSeason: "2025/26" }],
    ])
    const blended = blendRatings(ratings, baselines, 0)

    const withBaseline = blended.find((r) => r.code === 100)!
    expect(withBaseline.overall).toBe(88)
    expect(withBaseline.performanceGap).toBeNull()
    expect(withBaseline.trend).toBe("preseason")

    const without = blended.find((r) => r.code === 101)!
    expect(without.trend).toBe("no_baseline")
  })
})
