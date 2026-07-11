import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { blendRatings, classifyTrend, getBlendWeights } from "@/lib/ratings/blend"
import {
  assessMinutes,
  buildDistributions,
  computeRatings,
  mapPercentileToRating,
  percentileFromSorted,
  shareAtLeastFromSorted,
} from "@/lib/ratings/engine"
import { computeExpectedBaselines } from "@/lib/ratings/history"
import type {
  EnginePlayer,
  ExpectedBaseline,
  FplHistoryPastSeason,
  RatingElementType,
  RatingsBootstrapElement,
  SeasonHistoryInput,
} from "@/lib/ratings/model"
import { deriveBootstrapStats, per90, toNum } from "@/lib/ratings/stats"

function makePlayer(
  id: number,
  elementType: RatingElementType,
  minutes: number,
  stats: Record<string, number | null>
): EnginePlayer {
  return {
    id,
    code: 10000 + id,
    webName: `Player ${id}`,
    elementType,
    minutes,
    stats: { minutes, ...stats },
  }
}

/** A cohort of 12 midfielders with linearly increasing quality. */
function makeMidfieldCohort(): EnginePlayer[] {
  return Array.from({ length: 12 }, (_, i) =>
    makePlayer(i + 1, 3, 900 + i * 90, {
      xg_per_90: i * 0.05,
      goals_per_90: i * 0.04,
      goals_scored: i,
      penalties_missed: 0,
      threat_per_90: i * 5,
      xgi_per_90: i * 0.08,
      xa_per_90: i * 0.03,
      assists_per_90: i * 0.03,
      assists: i,
      creativity_per_90: i * 4,
      ict_per_90: i * 1.2,
      bps_per_90: 10 + i * 2,
      bonus_per_90: i * 0.1,
      points_per_game: 2 + i * 0.4,
      points_per_90: 2 + i * 0.4,
      total_points: 30 + i * 12,
      defcon_per_90: i,
      cbi_per_90: i * 0.5,
      tackles_per_90: i * 0.3,
      recoveries_per_90: i,
      clean_sheets_per_90: i * 0.03,
      xgc_per_90: 2 - i * 0.1,
      yellow_per_90: 0.3 - i * 0.02,
      red_per_90: 0,
      own_goals: 0,
      starts: 10 + i,
      starts_per_90: 0.5 + i * 0.04,
      points_per_million: 5 + i,
      value_season: 5 + i,
      value_form: 0.5 + i * 0.1,
      saves_per_90: null,
      saves: null,
      penalties_saved: null,
      goals_conceded_per_90: null,
    })
  )
}

describe("percentileFromSorted", () => {
  it("returns open-interval percentiles ordered with value", () => {
    const sorted = [1, 2, 3, 4, 5]
    const low = percentileFromSorted(sorted, 1)
    const high = percentileFromSorted(sorted, 5)
    expect(low).toBeGreaterThan(0)
    expect(high).toBeLessThan(1)
    expect(high!).toBeGreaterThan(low!)
  })

  it("returns null for empty or invalid input", () => {
    expect(percentileFromSorted([], 3)).toBeNull()
    expect(percentileFromSorted([1, 2], null)).toBeNull()
  })
})

describe("shareAtLeastFromSorted", () => {
  it("ranks the zero-mass optimum at the top for lowerIsBetter stats", () => {
    // Most of the cohort has 0 yellows; a few have cards.
    const sorted = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2]
    const clean = shareAtLeastFromSorted(sorted, 0)!
    const oneCard = shareAtLeastFromSorted(sorted, 1)!
    const twoCards = shareAtLeastFromSorted(sorted, 2)!

    expect(clean).toBeGreaterThan(oneCard)
    expect(oneCard).toBeGreaterThan(twoCards)
    // `1 - percentile` would put zeros near the bottom; share-at-least must not.
    const naiveInvert = 1 - percentileFromSorted(sorted, 0)!
    expect(clean).toBeGreaterThan(naiveInvert)
  })

  it("returns null for empty or invalid input", () => {
    expect(shareAtLeastFromSorted([], 0)).toBeNull()
    expect(shareAtLeastFromSorted([0, 1], null)).toBeNull()
  })
})

describe("lowerIsBetter discipline ratings", () => {
  it("gives clean players elite discipline leaf ratings", () => {
    const cohort = Array.from({ length: 12 }, (_, i) =>
      makePlayer(i + 1, 2, 2000, {
        // Outfield DEF leaf stats — only discipline varies for this check.
        defcon_per_90: 5,
        cbi_per_90: 3,
        tackles_per_90: 2,
        recoveries_per_90: 4,
        clean_sheets_per_90: 0.3,
        xgc_per_90: 1.2,
        yellow_per_90: i < 10 ? 0 : 0.2,
        red_per_90: i < 11 ? 0 : 0.05,
        own_goals: i < 11 ? 0 : 1,
        minutes: 2000,
        starts: 22,
        xg_per_90: 0.05,
        goals_per_90: 0.04,
        goals_scored: 1,
        penalties_missed: 0,
        threat_per_90: 10,
        xgi_per_90: 0.1,
        xa_per_90: 0.05,
        assists_per_90: 0.04,
        assists: 1,
        creativity_per_90: 10,
        ict_per_90: 5,
        bps_per_90: 20,
        bonus_per_90: 0.2,
        points_per_game: 4,
        points_per_90: 4,
        total_points: 100,
        points_per_million: 15,
        value_season: 10,
        value_form: 1,
      })
    )

    const ratings = computeRatings(cohort, { event: 25 })
    const clean = ratings[0]!
    const dirty = ratings[11]!

    const cleanYellow = clean.categories.DEF?.sub.Discipline.stats.yellow_per_90
    const dirtyYellow = dirty.categories.DEF?.sub.Discipline.stats.yellow_per_90
    const cleanOg = clean.categories.DEF?.sub.Discipline.stats.own_goals
    const dirtyOg = dirty.categories.DEF?.sub.Discipline.stats.own_goals

    expect(cleanYellow?.rating).toBeGreaterThan(70)
    expect(cleanYellow!.rating!).toBeGreaterThan(dirtyYellow!.rating!)
    expect(cleanOg?.rating).toBeGreaterThan(70)
    expect(cleanOg!.rating!).toBeGreaterThan(dirtyOg!.rating!)
  })
})

describe("mapPercentileToRating", () => {
  it("is monotonic and bounded 10..100", () => {
    let previous = -Infinity
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const rating = mapPercentileToRating(Math.min(1, p))
      expect(rating).toBeGreaterThanOrEqual(10)
      expect(rating).toBeLessThanOrEqual(100)
      expect(rating).toBeGreaterThanOrEqual(previous)
      previous = rating
    }
  })

  it("hits the FIFA-feel anchors", () => {
    expect(mapPercentileToRating(0.4)).toBe(50)
    expect(mapPercentileToRating(0.9)).toBe(90)
    expect(mapPercentileToRating(1)).toBe(100)
  })
})

describe("assessMinutes", () => {
  it("scales with the gameweek and caps at a full assessment", () => {
    expect(assessMinutes(2)).toBe(90)
    expect(assessMinutes(5)).toBe(225)
    expect(assessMinutes(10)).toBe(450)
    expect(assessMinutes(30)).toBe(900)
    expect(assessMinutes(null)).toBe(900)
    expect(assessMinutes(0)).toBe(900)
  })
})

describe("buildDistributions", () => {
  it("drops zero-variance and under-sampled stats", () => {
    const cohort = makeMidfieldCohort()
    const distributions = buildDistributions(cohort).get(3)!
    // red_per_90 is 0 for every player → no variance → dropped
    expect(distributions.red_per_90).toBeUndefined()
    expect(distributions.xg_per_90).toBeDefined()
  })

  it("excludes players under the cohort minutes floor", () => {
    const cohort = makeMidfieldCohort()
    cohort.push(makePlayer(99, 3, 30, { xg_per_90: 99 }))
    const distributions = buildDistributions(cohort).get(3)!
    expect(distributions.xg_per_90).not.toContain(99)
  })
})

describe("computeRatings", () => {
  it("ranks better players higher within a position cohort", () => {
    const ratings = computeRatings(makeMidfieldCohort(), { event: 20 })
    const best = ratings.find((r) => r.id === 12)!
    const worst = ratings.find((r) => r.id === 1)!
    expect(best.overall).toBeGreaterThan(worst.overall)
    expect(best.overall).toBeLessThanOrEqual(100)
    expect(worst.overall).toBeGreaterThanOrEqual(10)
  })

  it("damps low-minute players toward 50 without double-shrinking", () => {
    const cohort = makeMidfieldCohort()
    const cameo = makePlayer(50, 3, 45, {
      xg_per_90: 2,
      goals_per_90: 2,
      threat_per_90: 100,
      xgi_per_90: 2.5,
    })
    const ratings = computeRatings([...cohort, cameo], { event: 20 })
    const rated = ratings.find((r) => r.id === 50)!
    expect(rated.unassessed).toBe(true)
    expect(rated.damping).toBeCloseTo(0.05, 5)
    // 45 of 900 assessed → category scores at most 5% away from neutral 50
    for (const category of Object.values(rated.categories)) {
      expect(Math.abs(category.score - 50)).toBeLessThanOrEqual(3)
    }
  })

  it("gives keepers GKP instead of ATK and outfielders the reverse", () => {
    const cohort = makeMidfieldCohort()
    const keeper = makePlayer(60, 1, 1800, {
      saves_per_90: 3.5,
      saves: 70,
      penalties_saved: 1,
      clean_sheets_per_90: 0.4,
      xgc_per_90: 1.1,
      goals_conceded_per_90: 1.2,
    })
    const ratings = computeRatings([...cohort, keeper], { event: 20 })
    const keeperRating = ratings.find((r) => r.id === 60)!
    const midRating = ratings.find((r) => r.id === 5)!
    expect(keeperRating.categories.GKP).toBeDefined()
    expect(keeperRating.categories.ATK).toBeUndefined()
    expect(midRating.categories.ATK).toBeDefined()
    expect(midRating.categories.GKP).toBeUndefined()
  })
})

describe("blend", () => {
  it("uses phase weights across the season arc", () => {
    expect(getBlendWeights(null)).toEqual({ current: 0, historical: 1 })
    expect(getBlendWeights(4).current).toBeCloseTo(0.4)
    expect(getBlendWeights(15).current).toBeCloseTo(0.6)
    expect(getBlendWeights(30).current).toBeCloseTo(0.8)
  })

  it("classifies trend with season-phase tolerance", () => {
    expect(classifyTrend(null, 10)).toBe("no_baseline")
    expect(classifyTrend(10, 4)).toBe("early_season_variance")
    expect(classifyTrend(20, 4)).toBe("overperforming")
    expect(classifyTrend(-9, 15)).toBe("underperforming")
    expect(classifyTrend(6, 30)).toBe("overperforming")
    expect(classifyTrend(3, 30)).toBe("performing_as_expected")
  })

  it("leans on a decayed baseline for long-absent players", () => {
    const cohort = makeMidfieldCohort()
    const injured = makePlayer(70, 3, 0, {})
    const ratings = computeRatings([...cohort, injured], { event: 25 })

    const baselines = new Map<number, ExpectedBaseline>([
      [
        injured.code,
        { overall: 88, categories: {}, seasonsUsed: 3, latestSeason: "2025/26" },
      ],
    ])

    const blended = blendRatings(ratings, baselines, 25)
    const result = blended.find((r) => r.id === 70)!
    // damping 0 → current weight 0 → pure baseline, but 0 minutes by GW25
    // decays the 88 baseline halfway toward 50 → 69.
    expect(result.overall).toBe(69)
    expect(result.currentOverall).toBe(50)
    expect(result.expectedOverall).toBe(69)
  })

  it("keeps the full baseline within the early-season grace window", () => {
    const cohort = makeMidfieldCohort()
    const injured = makePlayer(70, 3, 0, {})
    const ratings = computeRatings([...cohort, injured], { event: 3 })

    const baselines = new Map<number, ExpectedBaseline>([
      [
        injured.code,
        { overall: 88, categories: {}, seasonsUsed: 3, latestSeason: "2025/26" },
      ],
    ])

    const blended = blendRatings(ratings, baselines, 3)
    const result = blended.find((r) => r.id === 70)!
    expect(result.expectedOverall).toBe(88)
    expect(result.overall).toBe(88)
  })

  it("ignores the baseline entirely for departed players", () => {
    const cohort = makeMidfieldCohort()
    const departed = makePlayer(70, 3, 0, {})
    departed.status = "u"
    const ratings = computeRatings([...cohort, departed], { event: 25 })

    const baselines = new Map<number, ExpectedBaseline>([
      [
        departed.code,
        { overall: 92, categories: {}, seasonsUsed: 3, latestSeason: "2025/26" },
      ],
    ])

    const blended = blendRatings(ratings, baselines, 25)
    const result = blended.find((r) => r.id === 70)!
    expect(result.expectedOverall).toBeNull()
    expect(result.overall).toBe(result.currentOverall)
    expect(result.trend).toBe("no_baseline")
  })

  it("returns current rating untouched when no baseline exists", () => {
    const ratings = computeRatings(makeMidfieldCohort(), { event: 25 })
    const blended = blendRatings(ratings, new Map(), 25)
    for (const [index, result] of blended.entries()) {
      expect(result.overall).toBe(ratings[index].overall)
      expect(result.trend).toBe("no_baseline")
    }
  })
})

describe("computeExpectedBaselines", () => {
  function historySeason(
    playerCode: number,
    seasonName: string,
    quality: number,
    minutes = 3000
  ): SeasonHistoryInput {
    const stats: FplHistoryPastSeason = {
      season_name: seasonName,
      element_code: playerCode,
      start_cost: 60,
      end_cost: 60,
      total_points: quality * 20,
      minutes,
      goals_scored: quality,
      assists: quality,
      clean_sheets: quality,
      goals_conceded: 40,
      own_goals: 0,
      penalties_saved: 0,
      penalties_missed: 0,
      yellow_cards: 2,
      red_cards: 0,
      saves: 0,
      bonus: quality,
      bps: quality * 50,
      influence: String(quality * 40),
      creativity: String(quality * 40),
      threat: String(quality * 40),
      ict_index: String(quality * 12),
      clearances_blocks_interceptions: quality * 10,
      recoveries: quality * 20,
      tackles: quality * 8,
      defensive_contribution: quality * 15,
      starts: Math.floor(minutes / 90),
      expected_goals: String(quality * 0.8),
      expected_assists: String(quality * 0.6),
      expected_goal_involvements: String(quality * 1.4),
      expected_goals_conceded: "40.0",
    }
    return {
      playerCode,
      webName: `P${playerCode}`,
      elementType: 3,
      seasonName,
      stats,
    }
  }

  it("weights recent seasons more heavily", () => {
    const rows: SeasonHistoryInput[] = []
    // A cohort of 10 players across two seasons.
    for (let code = 1; code <= 10; code++) {
      rows.push(historySeason(code, "2024/25", code))
      // Player 1 was elite last season but poor the season before; player 10
      // the reverse.
      rows.push(historySeason(code, "2025/26", 11 - code))
    }

    const baselines = computeExpectedBaselines(rows)
    const risingStar = baselines.get(1)! // poor 24/25 (q=1), elite 25/26 (q=10)
    const fadedStar = baselines.get(10)! // elite 24/25 (q=10), poor 25/26 (q=1)
    expect(risingStar.overall).toBeGreaterThan(fadedStar.overall)
    expect(risingStar.latestSeason).toBe("2025/26")
  })

  it("downweights injury-shortened seasons", () => {
    const rows: SeasonHistoryInput[] = []
    for (let code = 1; code <= 10; code++) {
      rows.push(historySeason(code, "2025/26", code))
    }
    // Player 20: elite full season two years ago, 90-minute season last year.
    rows.push(historySeason(20, "2024/25", 10))
    for (let code = 1; code <= 10; code++) {
      rows.push(historySeason(code, "2024/25", code))
    }
    rows.push(historySeason(20, "2025/26", 1, 90))

    const baselines = computeExpectedBaselines(rows)
    const player = baselines.get(20)!
    // Baseline should stay well above the damped 90-minute season.
    expect(player.overall).toBeGreaterThan(60)
  })
})

describe("stat derivation", () => {
  it("parses FPL string numerics and computes per-90s", () => {
    expect(toNum("3.5")).toBe(3.5)
    expect(toNum("")).toBeNull()
    expect(toNum(null)).toBeNull()
    expect(per90(10, 900)).toBe(1)
    expect(per90(10, 0)).toBeNull()
  })
})

describe("integration: real bootstrap snapshot", () => {
  const snapshotPath = path.resolve(
    __dirname,
    "../../../data/fpl-api/bootstrap-static.json"
  )
  const hasSnapshot = fs.existsSync(snapshotPath)

  it.skipIf(!hasSnapshot)(
    "produces sane ratings for a full league",
    () => {
      const bootstrap = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as {
        events: { id: number; is_current: boolean; finished: boolean }[]
        elements: RatingsBootstrapElement[]
      }
      const event =
        bootstrap.events.find((e) => e.is_current)?.id ??
        bootstrap.events.filter((e) => e.finished).length

      const players: EnginePlayer[] = bootstrap.elements.map((el) => ({
        id: el.id,
        code: el.code,
        webName: el.web_name,
        elementType: el.element_type,
        minutes: Number(el.minutes) || 0,
        stats: deriveBootstrapStats(el),
      }))

      const ratings = computeRatings(players, { event })

      expect(ratings).toHaveLength(bootstrap.elements.length)
      for (const rating of ratings) {
        expect(rating.overall).toBeGreaterThanOrEqual(10)
        expect(rating.overall).toBeLessThanOrEqual(100)
      }

      // Elite players by points should rate highly overall.
      const byPoints = [...bootstrap.elements].sort(
        (a, b) => b.total_points - a.total_points
      )
      const topScorer = ratings.find((r) => r.id === byPoints[0].id)!
      expect(topScorer.overall).toBeGreaterThanOrEqual(80)

      // Regulars (2000+ minutes) should comfortably out-rate the damped
      // never-played population on average.
      const regulars = ratings.filter((r) => r.minutes >= 2000)
      const unplayed = ratings.filter((r) => r.minutes === 0)
      const avg = (list: typeof ratings) =>
        list.reduce((sum, r) => sum + r.overall, 0) / list.length
      expect(avg(regulars)).toBeGreaterThan(avg(unplayed) + 10)
    }
  )
})
