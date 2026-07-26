import { describe, expect, it } from "vitest"

import type { FplElement } from "@/lib/fpl/types"
import type {
  BlendedCategoryScore,
  CategoryId,
  PlayerRatingSummary,
} from "@/lib/ratings/model"
import {
  buildMetricRange,
  buildScoutSummary,
  buildSummaryChips,
  formatPercentile,
  medianOf,
  ordinal,
  percentileOf,
  pointsPerMillion,
  quantile,
} from "@/lib/scouts/summary"

function makePlayer(
  overrides: Partial<FplElement> & Pick<FplElement, "id" | "element_type">
): FplElement {
  return {
    code: overrides.id * 1000,
    web_name: `Player ${overrides.id}`,
    first_name: "Test",
    second_name: "Player",
    team: 1,
    now_cost: 50,
    form: "3.0",
    points_per_game: "3.0",
    total_points: 60,
    bonus: 5,
    defensive_contribution: 0,
    goals_scored: 0,
    assists: 0,
    minutes: 1800,
    starts: 20,
    selected_by_percent: "5.0",
    status: "a",
    news: "",
    chance_of_playing_next_round: null,
    ...overrides,
  }
}

function makeRating(
  overrides: Partial<PlayerRatingSummary> & Pick<PlayerRatingSummary, "id">
): PlayerRatingSummary {
  return {
    code: overrides.id * 1000,
    webName: `Player ${overrides.id}`,
    elementType: 3,
    overall: 70,
    currentOverall: 70,
    expectedOverall: 70,
    performanceGap: 0,
    trend: "performing_as_expected",
    confidence: "high",
    unassessed: false,
    categories: {},
    ...overrides,
  }
}

describe("percentileOf", () => {
  it("splits ties so an identical cohort sits at the midpoint", () => {
    expect(percentileOf([5, 5, 5, 5], 5)).toBe(50)
  })

  it("scores the top value near 100 and the bottom near 0", () => {
    const sorted = [1, 2, 3, 4, 5]
    expect(percentileOf(sorted, 5)).toBe(90)
    expect(percentileOf(sorted, 1)).toBe(10)
  })

  it("returns null for an empty cohort", () => {
    expect(percentileOf([], 5)).toBeNull()
  })
})

describe("medianOf", () => {
  it("averages the middle pair for an even-length cohort", () => {
    expect(medianOf([1, 2, 3, 4])).toBe(2.5)
  })

  it("returns null for an empty cohort", () => {
    expect(medianOf([])).toBeNull()
  })
})

describe("ordinal", () => {
  it("uses th for the teens", () => {
    expect(ordinal(11)).toBe("11th")
    expect(ordinal(12)).toBe("12th")
    expect(ordinal(13)).toBe("13th")
  })

  it("uses st, nd, rd elsewhere", () => {
    expect(ordinal(1)).toBe("1st")
    expect(ordinal(22)).toBe("22nd")
    expect(ordinal(93)).toBe("93rd")
    expect(ordinal(50)).toBe("50th")
  })
})

describe("quantile", () => {
  it("interpolates between neighbouring values", () => {
    expect(quantile([0, 10], 0.5)).toBe(5)
    expect(quantile([0, 10, 20, 30, 40], 0.25)).toBe(10)
  })

  it("returns null for an empty array", () => {
    expect(quantile([], 0.5)).toBeNull()
  })
})

describe("buildMetricRange", () => {
  // 0, 1, 2, ... 99 — a flat distribution makes the band edges easy to reason about.
  const flat = Array.from({ length: 100 }, (_, index) => index)

  it("reports the quartile boundaries in the metric's own units", () => {
    const range = buildMetricRange(flat, 50, { unit: "pts", decimals: 0 })

    expect(range?.boundaries[0]).toBeCloseTo(24.75)
    expect(range?.boundaries[1]).toBeCloseTo(49.5)
    expect(range?.boundaries[2]).toBeCloseTo(74.25)
  })

  it("positions the marker by rank, so a huge outlier cannot skew the axis", () => {
    const withOutlier = [...flat, 100000].sort((a, b) => a - b)
    const range = buildMetricRange(withOutlier, 50, { unit: "pts", decimals: 0 })

    // Rank space is immune to the outlier: 50 still beats about half the field.
    expect(range?.valuePercentile).toBeGreaterThan(45)
    expect(range?.valuePercentile).toBeLessThan(55)
  })

  it("assigns one band per quartile of the cohort", () => {
    const band = (value: number) =>
      buildMetricRange(flat, value, { unit: "pts", decimals: 0 })?.bandId

    expect(band(5)).toBe("poor")
    expect(band(30)).toBe("typical")
    expect(band(60)).toBe("strong")
    expect(band(90)).toBe("elite")
  })

  it("declines to band a cohort that is too small or has no spread", () => {
    expect(buildMetricRange([1, 2, 3], 2, { unit: "", decimals: 0 })).toBeNull()
    expect(
      buildMetricRange(Array(40).fill(7), 7, { unit: "", decimals: 0 })
    ).toBeNull()
  })

  it("returns null when the player has no value for the metric", () => {
    expect(buildMetricRange(flat, null, { unit: "", decimals: 0 })).toBeNull()
  })
})

describe("formatPercentile", () => {
  it("clamps to 1st and 99th so nobody reads as 100th percentile", () => {
    expect(formatPercentile(99.8)).toBe("99th")
    expect(formatPercentile(100)).toBe("99th")
    expect(formatPercentile(0.2)).toBe("1st")
  })
})

describe("pointsPerMillion", () => {
  it("converts tenths-of-a-million cost into points per million", () => {
    expect(pointsPerMillion(makePlayer({ id: 1, element_type: 3, now_cost: 50, total_points: 100 }))).toBe(20)
  })

  it("returns null for a zero price", () => {
    expect(pointsPerMillion(makePlayer({ id: 1, element_type: 3, now_cost: 0 }))).toBeNull()
  })
})

describe("buildSummaryChips", () => {
  function makeCategory(
    weight: number,
    stats: Record<string, { rating: number | null; percentile: number | null; weight: number }>
  ): BlendedCategoryScore {
    return {
      score: 70,
      weight,
      current: 70,
      expected: 70,
      sub: {
        Main: {
          score: 70,
          weight: 1,
          stats: Object.fromEntries(
            Object.entries(stats).map(([key, stat]) => [
              key,
              { ...stat, value: 1, lowerIsBetter: false },
            ])
          ),
        },
      },
    }
  }

  it("surfaces the best and worst weighted leaf stats", () => {
    const categories: Partial<Record<CategoryId, BlendedCategoryScore>> = {
      ATK: makeCategory(0.4, {
        xg_per_90: { rating: 94, percentile: 0.94, weight: 0.5 },
        goals_per_90: { rating: 30, percentile: 0.12, weight: 0.5 },
      }),
    }

    const chips = buildSummaryChips(categories)

    expect(chips.map((chip) => chip.kind)).toEqual(["strength", "concern"])
    expect(chips[0].detail).toBe("94th")
    expect(chips[1].detail).toBe("12th")
  })

  it("does not claim a strength the percentile cannot back up", () => {
    // Zero own goals curves to a high rating but sits mid-cohort, because most
    // players also have none. A "99 rating, 40th percentile" chip reads wrong.
    const categories: Partial<Record<CategoryId, BlendedCategoryScore>> = {
      DEF: makeCategory(0.3, {
        own_goals: { rating: 99, percentile: 0.4, weight: 0.5 },
      }),
    }

    expect(buildSummaryChips(categories)).toEqual([])
  })

  it("ignores leaves whose effective weight is negligible", () => {
    const categories: Partial<Record<CategoryId, BlendedCategoryScore>> = {
      FPL: makeCategory(0.001, {
        value_form: { rating: 99, percentile: 0.99, weight: 0.2 },
      }),
    }

    expect(buildSummaryChips(categories)).toEqual([])
  })

  it("returns nothing when no detail has loaded", () => {
    expect(buildSummaryChips(undefined)).toEqual([])
  })
})

describe("buildScoutSummary", () => {
  const cohort = [
    makePlayer({ id: 1, element_type: 3, now_cost: 50, total_points: 40, points_per_game: "2.0" }),
    makePlayer({ id: 2, element_type: 3, now_cost: 60, total_points: 60, points_per_game: "3.0" }),
    makePlayer({ id: 3, element_type: 3, now_cost: 70, total_points: 140, points_per_game: "7.0" }),
    // A defender and a low-minute midfielder, both outside the cohort.
    makePlayer({ id: 4, element_type: 2, now_cost: 45, total_points: 200 }),
    makePlayer({ id: 5, element_type: 3, now_cost: 45, total_points: 4, minutes: 20 }),
  ]

  const ratingsById = new Map<number, PlayerRatingSummary>([
    [1, makeRating({ id: 1, overall: 55 })],
    [2, makeRating({ id: 2, overall: 65 })],
    [3, makeRating({ id: 3, overall: 88 })],
    [4, makeRating({ id: 4, elementType: 2, overall: 92 })],
  ])

  function summarise(playerId: number, rating?: PlayerRatingSummary) {
    const player = cohort.find((entry) => entry.id === playerId)!
    return buildScoutSummary({
      player,
      clubShortName: "ARS",
      rating: rating ?? ratingsById.get(playerId),
      ratingsById,
      players: cohort,
      detailCategories: undefined,
      fixtures: null,
      history: [],
    })
  }

  it("compares against the player's own position only", () => {
    const summary = summarise(3)
    const ability = summary.metrics.find((metric) => metric.id === "ability")!

    // Best of the three qualifying midfielders — the 92-rated defender is excluded.
    expect(ability.value).toBe("88")
    expect(ability.detail).toBe("83rd percentile among midfielders")
    expect(ability.tone).toBe("positive")
  })

  it("excludes players below the cohort minutes floor", () => {
    const summary = summarise(1)
    const minutes = summary.metrics.find((metric) => metric.id === "minutes")!

    // Three qualifying midfielders all on 1800 minutes → a clean tie at the midpoint.
    expect(minutes.percentile).toBe(50)
  })

  it("reports value against the position median", () => {
    const summary = summarise(3)
    const value = summary.metrics.find((metric) => metric.id === "value")!

    expect(value.value).toBe("20.0 pts/£m")
    expect(value.detail).toBe("Median for midfielders is 10.0")
  })

  it("renders the baseline gap with an explicit sign", () => {
    const summary = summarise(
      2,
      makeRating({
        id: 2,
        overall: 65,
        expectedOverall: 58,
        performanceGap: 7,
        trend: "overperforming",
      })
    )
    const trajectory = summary.metrics.find((metric) => metric.id === "trajectory")!

    expect(trajectory.value).toBe("+7")
    expect(trajectory.tone).toBe("positive")
    expect(summary.headline).toContain("7 points above his historic level")
  })

  it("drops the trajectory row pre-season, when there is no gap to show", () => {
    const summary = summarise(
      2,
      makeRating({
        id: 2,
        overall: 65,
        expectedOverall: 65,
        performanceGap: null,
        trend: "preseason",
      })
    )

    expect(summary.metrics.some((metric) => metric.id === "trajectory")).toBe(false)
    expect(summary.headline).toContain("Rated on last season's evidence")
  })

  it("drops the trajectory row when the player has no rating", () => {
    const summary = summarise(5, undefined)

    expect(summary.metrics.some((metric) => metric.id === "trajectory")).toBe(false)
    expect(summary.headline).toContain("No rating yet")
  })

  it("calls out an unassessed player instead of ranking him", () => {
    const summary = summarise(5, makeRating({ id: 5, unassessed: true, overall: 50 }))

    expect(summary.headline).toContain("too little to assess")
  })

  it("surfaces availability only when there is something to report", () => {
    expect(summarise(1).availability).toBeNull()

    const injured = buildScoutSummary({
      player: makePlayer({
        id: 9,
        element_type: 3,
        status: "i",
        news: "Hamstring injury - expected back 05 Sep",
        chance_of_playing_next_round: 25,
      }),
      clubShortName: "ARS",
      rating: makeRating({ id: 9 }),
      ratingsById,
      players: cohort,
      detailCategories: undefined,
      fixtures: null,
      history: [],
    })

    expect(injured.availability).toEqual({
      label: "Injured · 25% chance",
      note: "Hamstring injury - expected back 05 Sep",
      tone: "negative",
    })
  })
})
