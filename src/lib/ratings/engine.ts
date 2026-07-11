import {
  ASSESS_MINUTES_PER_EVENT,
  COHORT_MIN_MINUTES,
  FULL_ASSESS_MINUTES,
  MIN_DISTRIBUTION_SAMPLES,
  NEUTRAL_RATING,
  POSITION_CATEGORY_WEIGHTS,
  RATING_CURVE_ANCHORS,
  RATING_HIERARCHY,
  RATING_MAX,
  RATING_MIN,
} from "@/lib/ratings/hierarchy"
import type {
  CategoryId,
  CategoryScore,
  EnginePlayer,
  PlayerRating,
  RatingConfidence,
  RatingElementType,
  StatScore,
  SubScore,
} from "@/lib/ratings/model"

/**
 * Pure rating engine. No I/O — feed it EnginePlayers (current season or one
 * historical season) and it returns per-player category + overall ratings.
 *
 * Percentile cohorts are built PER POSITION from players with at least
 * COHORT_MIN_MINUTES, so a defender's ATK score measures them against other
 * defenders, not Haaland. Distributions with too few samples or zero variance
 * (e.g. stats FPL didn't track that season) are skipped and their weight is
 * renormalised across siblings.
 */

/** Fraction of sorted values <= v, on a (0, 1) open interval. */
export function percentileFromSorted(
  sorted: readonly number[],
  value: number | null
): number | null {
  if (sorted.length === 0 || value === null || !Number.isFinite(value)) {
    return null
  }
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] <= value) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  return lo / (sorted.length + 1)
}

export function mapPercentileToRating(p: number): number {
  const anchors = RATING_CURVE_ANCHORS
  if (p <= anchors[0].p) {
    return anchors[0].r
  }
  for (let i = 1; i < anchors.length; i++) {
    if (p <= anchors[i].p) {
      const a = anchors[i - 1]
      const b = anchors[i]
      const t = (p - a.p) / (b.p - a.p || 1)
      return a.r + t * (b.r - a.r)
    }
  }
  return anchors[anchors.length - 1].r
}

/** Minutes needed to be fully assessed, scaled by season progress. */
export function assessMinutes(event: number | null): number {
  if (event === null || event <= 0) {
    return FULL_ASSESS_MINUTES
  }
  return Math.max(
    COHORT_MIN_MINUTES,
    Math.min(FULL_ASSESS_MINUTES, event * ASSESS_MINUTES_PER_EVENT)
  )
}

export function calculateConfidence(
  minutes: number,
  event: number | null
): RatingConfidence {
  const gamesPlayed = Math.floor(minutes / 90)
  const effectiveEvent = event === null || event <= 0 ? 38 : event

  if (effectiveEvent <= 5) {
    return gamesPlayed >= 3 ? "medium" : "low"
  }
  if (effectiveEvent <= 15) {
    if (gamesPlayed >= 8) return "high"
    return gamesPlayed >= 5 ? "medium" : "low"
  }
  if (gamesPlayed >= 15) return "high"
  return gamesPlayed >= 10 ? "medium" : "low"
}

type Distributions = Record<string, number[] | undefined>

function collectStatKeys(): string[] {
  const keys = new Set<string>()
  for (const category of Object.values(RATING_HIERARCHY)) {
    for (const sub of Object.values(category.sub)) {
      for (const stat of sub.stats) {
        keys.add(stat.key)
      }
    }
  }
  return [...keys]
}

/**
 * Per-position sorted distributions from cohort players (>= COHORT_MIN_MINUTES).
 * A distribution is dropped when it has too few samples or no variance.
 */
export function buildDistributions(
  players: readonly EnginePlayer[]
): Map<RatingElementType, Distributions> {
  const keys = collectStatKeys()
  const byPosition = new Map<RatingElementType, Distributions>()

  for (const elementType of [1, 2, 3, 4] as const) {
    const cohort = players.filter(
      (p) => p.elementType === elementType && p.minutes >= COHORT_MIN_MINUTES
    )
    const distributions: Distributions = {}

    for (const key of keys) {
      const values = cohort
        .map((p) => p.stats[key])
        .filter((v): v is number => v !== null && Number.isFinite(v))
        .sort((a, b) => a - b)

      const hasVariance =
        values.length > 0 && values[0] !== values[values.length - 1]

      if (values.length >= MIN_DISTRIBUTION_SAMPLES && hasVariance) {
        distributions[key] = values
      }
    }

    byPosition.set(elementType, distributions)
  }

  return byPosition
}

function clampRating(value: number): number {
  return Math.min(RATING_MAX, Math.max(RATING_MIN, value))
}

function ratePlayer(
  player: EnginePlayer,
  distributions: Distributions,
  event: number | null
): PlayerRating {
  const minutes = player.minutes
  const threshold = assessMinutes(event)
  const damping = Math.max(0, Math.min(1, minutes / threshold))
  const unassessed = minutes < threshold
  const positionWeights = POSITION_CATEGORY_WEIGHTS[player.elementType]

  const categories: Partial<Record<CategoryId, CategoryScore>> = {}

  for (const [categoryId, categoryWeight] of Object.entries(positionWeights) as [
    CategoryId,
    number,
  ][]) {
    const spec = RATING_HIERARCHY[categoryId]
    if (!spec) {
      continue
    }

    const subScores: Record<string, SubScore> = {}

    for (const [subName, subSpec] of Object.entries(spec.sub)) {
      const statScores: Record<string, StatScore> = {}
      let weighted = 0
      let weightTotal = 0

      for (const stat of subSpec.stats) {
        const value = player.stats[stat.key] ?? null
        const distribution = distributions[stat.key]
        const percentile = distribution
          ? percentileFromSorted(distribution, value)
          : null
        const adjusted =
          percentile === null
            ? null
            : stat.lowerIsBetter
              ? 1 - percentile
              : percentile
        const rating =
          adjusted === null
            ? null
            : Math.round(clampRating(mapPercentileToRating(adjusted)))

        statScores[stat.key] = {
          value,
          percentile,
          rating,
          weight: stat.weight,
          lowerIsBetter: stat.lowerIsBetter ?? false,
        }

        if (rating !== null) {
          weighted += rating * stat.weight
          weightTotal += stat.weight
        }
      }

      subScores[subName] = {
        score: weightTotal > 0 ? Math.round(weighted / weightTotal) : null,
        weight: subSpec.weight,
        stats: statScores,
      }
    }

    let categoryWeighted = 0
    let categoryWeightTotal = 0
    for (const sub of Object.values(subScores)) {
      if (sub.score !== null) {
        categoryWeighted += sub.score * sub.weight
        categoryWeightTotal += sub.weight
      }
    }

    const rawScore =
      categoryWeightTotal > 0
        ? categoryWeighted / categoryWeightTotal
        : NEUTRAL_RATING

    // Damping happens once, here at category level. The overall is computed
    // from already-damped categories (backroom damped both, double-shrinking
    // low-minute players toward 50).
    const dampedScore = Math.round(
      damping * rawScore + (1 - damping) * NEUTRAL_RATING
    )

    categories[categoryId] = {
      score: clampRating(dampedScore),
      weight: categoryWeight,
      sub: subScores,
    }
  }

  let overallWeighted = 0
  let overallWeightTotal = 0
  for (const [categoryId, category] of Object.entries(categories) as [
    CategoryId,
    CategoryScore,
  ][]) {
    const weight = positionWeights[categoryId] ?? 0
    overallWeighted += category.score * weight
    overallWeightTotal += weight
  }

  const overall =
    overallWeightTotal > 0
      ? clampRating(Math.round(overallWeighted / overallWeightTotal))
      : NEUTRAL_RATING

  return {
    id: player.id,
    code: player.code,
    webName: player.webName,
    elementType: player.elementType,
    minutes,
    status: player.status ?? null,
    gamesPlayed: Math.floor(minutes / 90),
    damping: Math.round(damping * 100) / 100,
    unassessed,
    confidence: calculateConfidence(minutes, event),
    overall,
    categories,
  }
}

export function computeRatings(
  players: readonly EnginePlayer[],
  options: { event: number | null }
): PlayerRating[] {
  const distributionsByPosition = buildDistributions(players)

  return players.map((player) =>
    ratePlayer(
      player,
      distributionsByPosition.get(player.elementType) ?? {},
      options.event
    )
  )
}
