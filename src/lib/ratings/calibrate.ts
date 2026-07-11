import {
  MIN_CALIBRATION_COHORT,
  OVERALL_CALIBRATION_ANCHORS,
  RATING_MAX,
  RATING_MIN,
} from "@/lib/ratings/hierarchy"
import type { PlayerRatingResult, RatingElementType } from "@/lib/ratings/model"

/**
 * Final calibration pass for overall ratings.
 *
 * The raw overall is a weighted average of category averages, which regresses
 * hard toward the middle: even the best player in the league tops out around
 * 85-86 because no one is elite in every category (an attacking midfielder's
 * DEF sits near 50 by construction). FIFA has the same property internally
 * and solves it the same way — a final mapping onto a designed distribution.
 *
 * We map each position's raw blended overalls onto OVERALL_CALIBRATION_ANCHORS
 * via quantiles: the best player in a position lands at ~95, the top ~1% at
 * ~91, the top 5% in the mid-to-high 80s. The mapping is a monotone piecewise
 * linear stretch on the score axis, so relative order and gaps are preserved
 * and players outside the calibration cohort (unassessed, no baseline) are
 * mapped through the same curve. Category scores are NOT calibrated — they
 * are direct percentiles and already spread to 99.
 */

type CalibrationFn = (raw: number) => number

export function quantileSorted(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) {
    return RATING_MIN
  }
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(q * sorted.length) - 1)
  )
  return sorted[index]
}

/**
 * Build a monotone raw → calibrated mapping from a cohort of raw scores.
 * Returns null when the cohort is too small to yield stable quantiles.
 */
export function buildCalibrationMap(
  scores: readonly number[]
): CalibrationFn | null {
  if (scores.length < MIN_CALIBRATION_COHORT) {
    return null
  }

  const sorted = [...scores].sort((a, b) => a - b)

  // Quantile x-coordinates for each target anchor. Duplicate x values
  // (ties in the cohort) collapse to the highest target so tied raw scores
  // share the higher rating.
  const points: { x: number; y: number }[] = []
  for (const anchor of OVERALL_CALIBRATION_ANCHORS) {
    const x = quantileSorted(sorted, anchor.q)
    const last = points[points.length - 1] as
      | { x: number; y: number }
      | undefined
    if (last && x <= last.x) {
      last.y = Math.max(last.y, anchor.r)
    } else {
      points.push({ x, y: anchor.r })
    }
  }

  // Virtual bottom anchor so scores below the cohort floor still map sanely.
  const bottom = { x: RATING_MIN, y: RATING_MIN }
  const curve = points[0].x > bottom.x ? [bottom, ...points] : points

  return (raw: number) => {
    if (raw <= curve[0].x) {
      return Math.max(RATING_MIN, Math.round(curve[0].y))
    }
    for (let i = 1; i < curve.length; i++) {
      if (raw <= curve[i].x) {
        const a = curve[i - 1]
        const b = curve[i]
        const t = (raw - a.x) / (b.x - a.x || 1)
        return Math.min(
          RATING_MAX,
          Math.max(RATING_MIN, Math.round(a.y + t * (b.y - a.y)))
        )
      }
    }
    return Math.min(RATING_MAX, Math.round(curve[curve.length - 1].y))
  }
}

/** Players whose blended overall carries real signal. */
function isCalibrationCohort(result: PlayerRatingResult): boolean {
  return result.expectedOverall !== null || !result.unassessed
}

/**
 * Calibrate overall/currentOverall/expectedOverall per position. The
 * performance gap is recomputed from calibrated values so it matches what is
 * displayed; trend classification stays based on the raw (pre-calibration)
 * gap, whose thresholds were chosen on that scale.
 */
export function calibrateRatings(
  results: readonly PlayerRatingResult[]
): PlayerRatingResult[] {
  const cohortByPosition = new Map<RatingElementType, number[]>()
  const globalCohort: number[] = []

  for (const result of results) {
    if (!isCalibrationCohort(result)) {
      continue
    }
    const list = cohortByPosition.get(result.elementType) ?? []
    list.push(result.overall)
    cohortByPosition.set(result.elementType, list)
    globalCohort.push(result.overall)
  }

  const globalMap = buildCalibrationMap(globalCohort)
  const identity: CalibrationFn = (raw) =>
    Math.min(RATING_MAX, Math.max(RATING_MIN, Math.round(raw)))

  const maps = new Map<RatingElementType, CalibrationFn>()
  for (const elementType of [1, 2, 3, 4] as const) {
    const positionMap = buildCalibrationMap(
      cohortByPosition.get(elementType) ?? []
    )
    maps.set(elementType, positionMap ?? globalMap ?? identity)
  }

  return results.map((result) => {
    const calibrate = maps.get(result.elementType) ?? identity
    const overall = calibrate(result.overall)
    const currentOverall = calibrate(result.currentOverall)
    const expectedOverall =
      result.expectedOverall === null ? null : calibrate(result.expectedOverall)
    const performanceGap =
      result.performanceGap === null || expectedOverall === null
        ? null
        : currentOverall - expectedOverall

    return {
      ...result,
      overall,
      currentOverall,
      expectedOverall,
      performanceGap,
    }
  })
}
