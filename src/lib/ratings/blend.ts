import {
  ABSENCE_GRACE_EVENTS,
  ABSENCE_MINUTES_PER_EVENT,
  DEPARTED_STATUSES,
  MAX_ABSENCE_DECAY,
  NEUTRAL_RATING,
  RATING_MAX,
  RATING_MIN,
} from "@/lib/ratings/hierarchy"
import type {
  BlendedCategoryScore,
  CategoryId,
  ExpectedBaseline,
  PlayerRating,
  PlayerRatingResult,
  RatingTrend,
} from "@/lib/ratings/model"

/**
 * Blending of current-season ratings with historical expected baselines.
 *
 * Phase weights follow the season arc: history dominates early, current form
 * dominates late. Pre-season (event 0/null) is fully historical, which is
 * what makes ratings meaningful in July/August before a ball is kicked.
 *
 * On top of the phase weight, a player's *individual* current weight is
 * scaled by their assessment damping: a player with 0 minutes in GW25 leans
 * on their baseline instead of being dragged to ~50 (a backroom flaw).
 */
export function getBlendWeights(event: number | null): {
  current: number
  historical: number
} {
  if (event === null || event <= 0) {
    return { current: 0, historical: 1 }
  }
  if (event <= 8) {
    return { current: 0.4, historical: 0.6 }
  }
  if (event <= 20) {
    return { current: 0.6, historical: 0.4 }
  }
  return { current: 0.8, historical: 0.2 }
}

export function classifyTrend(
  gap: number | null,
  event: number | null
): RatingTrend {
  if (gap === null) {
    return "no_baseline"
  }
  const effectiveEvent = event === null || event <= 0 ? 0 : event

  if (effectiveEvent <= 8) {
    if (gap > 15) return "overperforming"
    if (gap < -15) return "underperforming"
    return "early_season_variance"
  }
  if (effectiveEvent <= 20) {
    if (gap > 8) return "overperforming"
    if (gap < -8) return "underperforming"
    return "performing_as_expected"
  }
  if (gap > 5) return "overperforming"
  if (gap < -5) return "underperforming"
  return "performing_as_expected"
}

function clampRating(value: number): number {
  return Math.min(RATING_MAX, Math.max(RATING_MIN, value))
}

/**
 * 1 = playing as much as expected, 0 = fully absent since the grace window.
 * Pre-season and the first ABSENCE_GRACE_EVENTS gameweeks are always 1.
 */
export function availabilityFactor(
  minutes: number,
  event: number | null
): number {
  if (event === null || event <= ABSENCE_GRACE_EVENTS) {
    return 1
  }
  const expectedMinutes =
    (event - ABSENCE_GRACE_EVENTS) * ABSENCE_MINUTES_PER_EVENT
  return Math.max(0, Math.min(1, minutes / expectedMinutes))
}

/** Decay an expected rating toward neutral in proportion to absence. */
function decayExpected(expected: number, availability: number): number {
  const keep = 1 - MAX_ABSENCE_DECAY * (1 - availability)
  return Math.round(NEUTRAL_RATING + (expected - NEUTRAL_RATING) * keep)
}

function blendValue(
  current: number,
  expected: number | null,
  currentWeight: number
): number {
  if (expected === null) {
    return current
  }
  return clampRating(
    Math.round(current * currentWeight + expected * (1 - currentWeight))
  )
}

export function blendRatings(
  ratings: readonly PlayerRating[],
  baselines: ReadonlyMap<number, ExpectedBaseline>,
  event: number | null
): PlayerRatingResult[] {
  const phase = getBlendWeights(event)

  const preseason = event === null || event <= 0

  return ratings.map((rating) => {
    // Players who left the league (transferred, ineligible) don't get to
    // ride their historical baseline to the top of the rankings.
    const departed =
      rating.status !== null && DEPARTED_STATUSES.has(rating.status)
    const baseline = departed ? null : (baselines.get(rating.code) ?? null)

    // Individual current weight: phase weight scaled by how assessed the
    // player is this season. No baseline → current only.
    const currentWeight =
      baseline === null ? 1 : phase.current * rating.damping

    // Active players who aren't playing have their expectation decay toward
    // neutral as the absence stretches on.
    const availability = availabilityFactor(rating.minutes, event)
    const expectedOverall =
      baseline === null ? null : decayExpected(baseline.overall, availability)
    const overall = blendValue(rating.overall, expectedOverall, currentWeight)
    // Pre-season there is no current performance to compare against the
    // baseline — a gap/trend would just say "everyone is underperforming".
    const performanceGap =
      expectedOverall === null || preseason
        ? null
        : rating.overall - expectedOverall

    const categories: Partial<Record<CategoryId, BlendedCategoryScore>> = {}
    for (const [categoryId, category] of Object.entries(rating.categories) as [
      CategoryId,
      NonNullable<PlayerRating["categories"][CategoryId]>,
    ][]) {
      const expectedRaw = baseline?.categories[categoryId] ?? null
      const expected =
        expectedRaw === null ? null : decayExpected(expectedRaw, availability)
      categories[categoryId] = {
        ...category,
        current: category.score,
        expected,
        score: blendValue(category.score, expected, currentWeight),
      }
    }

    return {
      id: rating.id,
      code: rating.code,
      webName: rating.webName,
      elementType: rating.elementType,
      minutes: rating.minutes,
      status: rating.status,
      gamesPlayed: rating.gamesPlayed,
      damping: rating.damping,
      unassessed: rating.unassessed,
      confidence: rating.confidence,
      overall,
      currentOverall: rating.overall,
      expectedOverall,
      performanceGap,
      trend: preseason
        ? baseline !== null
          ? "preseason"
          : "no_baseline"
        : classifyTrend(performanceGap, event),
      categories,
    }
  })
}
