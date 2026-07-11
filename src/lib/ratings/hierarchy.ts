import type { CategoryId, RatingElementType, RatingHierarchy } from "@/lib/ratings/model"

/**
 * FIFA-style six-category hierarchy (GKP replaces ATK for goalkeepers).
 *
 * Design rules (fixes over the original backroom system):
 * - Per-90 stats carry the bulk of the weight; season totals appear only as
 *   small "body of work" terms so nailed-on starters edge cameo merchants.
 * - No stat appears in more than one sub-category (backroom double-counted
 *   CBI/tackles inside DEF).
 * - Percentiles are computed within position cohorts (see engine.ts), so no
 *   post-hoc position multipliers are needed.
 */
export const RATING_HIERARCHY: RatingHierarchy = {
  ATK: {
    sub: {
      Goalscoring: {
        weight: 0.65,
        stats: [
          { key: "xg_per_90", weight: 0.4 },
          { key: "goals_per_90", weight: 0.3 },
          { key: "goals_scored", weight: 0.25 },
          { key: "penalties_missed", weight: 0.05, lowerIsBetter: true },
        ],
      },
      Threat: {
        weight: 0.35,
        stats: [
          { key: "threat_per_90", weight: 0.5 },
          { key: "xgi_per_90", weight: 0.5 },
        ],
      },
    },
  },

  PLY: {
    sub: {
      Creation: {
        weight: 0.7,
        stats: [
          { key: "xa_per_90", weight: 0.45 },
          { key: "assists_per_90", weight: 0.3 },
          { key: "assists", weight: 0.25 },
        ],
      },
      Creativity: {
        weight: 0.3,
        stats: [{ key: "creativity_per_90", weight: 1 }],
      },
    },
  },

  IMP: {
    sub: {
      Influence: {
        weight: 0.5,
        stats: [
          { key: "ict_per_90", weight: 0.4 },
          { key: "bps_per_90", weight: 0.35 },
          { key: "bonus_per_90", weight: 0.25 },
        ],
      },
      Efficiency: {
        weight: 0.5,
        stats: [
          { key: "points_per_game", weight: 0.5 },
          { key: "points_per_90", weight: 0.3 },
          { key: "total_points", weight: 0.2 },
        ],
      },
    },
  },

  DEF: {
    sub: {
      Actions: {
        weight: 0.45,
        stats: [
          { key: "defcon_per_90", weight: 0.35 },
          { key: "cbi_per_90", weight: 0.3 },
          { key: "tackles_per_90", weight: 0.2 },
          { key: "recoveries_per_90", weight: 0.15 },
        ],
      },
      Outcomes: {
        weight: 0.35,
        stats: [
          { key: "clean_sheets_per_90", weight: 0.55 },
          { key: "xgc_per_90", weight: 0.45, lowerIsBetter: true },
        ],
      },
      Discipline: {
        weight: 0.2,
        stats: [
          { key: "yellow_per_90", weight: 0.5, lowerIsBetter: true },
          { key: "red_per_90", weight: 0.3, lowerIsBetter: true },
          { key: "own_goals", weight: 0.2, lowerIsBetter: true },
        ],
      },
    },
  },

  REL: {
    sub: {
      PlayingTime: {
        weight: 1,
        stats: [
          { key: "minutes", weight: 0.6 },
          { key: "starts_per_90", weight: 0.4 },
        ],
      },
    },
  },

  FPL: {
    sub: {
      Market: {
        weight: 1,
        stats: [
          { key: "points_per_million", weight: 0.6 },
          { key: "value_season", weight: 0.2 },
          { key: "value_form", weight: 0.2 },
        ],
      },
    },
  },

  GKP: {
    sub: {
      ShotStopping: {
        weight: 0.5,
        stats: [
          { key: "saves_per_90", weight: 0.5 },
          { key: "saves", weight: 0.25 },
          { key: "penalties_saved", weight: 0.25 },
        ],
      },
      Conceding: {
        weight: 0.5,
        stats: [
          { key: "clean_sheets_per_90", weight: 0.45 },
          { key: "xgc_per_90", weight: 0.35, lowerIsBetter: true },
          { key: "goals_conceded_per_90", weight: 0.2, lowerIsBetter: true },
        ],
      },
    },
  },
}

/**
 * Category weights per position. A category absent from a position's map is
 * not computed for that position (GKP only for keepers; ATK never for them).
 * Weights are renormalised at combine time, but each row sums to 1 by design.
 */
export const POSITION_CATEGORY_WEIGHTS: Record<
  RatingElementType,
  Partial<Record<CategoryId, number>>
> = {
  1: { GKP: 0.7, PLY: 0.05, IMP: 0.08, DEF: 0.05, REL: 0.1, FPL: 0.02 },
  2: { ATK: 0.11, PLY: 0.22, IMP: 0.19, DEF: 0.3, REL: 0.1, FPL: 0.08 },
  3: { ATK: 0.29, PLY: 0.19, IMP: 0.19, DEF: 0.15, REL: 0.1, FPL: 0.08 },
  4: { ATK: 0.43, PLY: 0.23, IMP: 0.11, DEF: 0.05, REL: 0.1, FPL: 0.08 },
}

/** Piecewise percentile → rating curve. Kept from backroom: it is what gives
 * ratings their FIFA feel (compressed bottom, steep elite tail). */
export const RATING_CURVE_ANCHORS: ReadonlyArray<{ p: number; r: number }> = [
  { p: 0.0, r: 10 },
  { p: 0.2, r: 30 },
  { p: 0.4, r: 50 },
  { p: 0.6, r: 65 },
  { p: 0.75, r: 75 },
  { p: 0.85, r: 85 },
  { p: 0.9, r: 90 },
  { p: 0.95, r: 95 },
  { p: 0.98, r: 98 },
  { p: 0.995, r: 99 },
  { p: 1.0, r: 100 },
]

export const RATING_MIN = 10
export const RATING_MAX = 100
export const NEUTRAL_RATING = 50

/** Minutes needed for cohort membership (percentile distributions). */
export const COHORT_MIN_MINUTES = 90

/**
 * Full assessment reached at 900 minutes (~10 full games), scaled down early
 * season. Below this, ratings damp toward 50 — the guard against hot per-90
 * numbers from small samples outranking proven full-season output.
 */
export const FULL_ASSESS_MINUTES = 900
export const ASSESS_MINUTES_PER_EVENT = 45

/**
 * Within-season baseline decay for absent players. A baseline says "this is
 * what we expect when they play"; a player racking up zero minutes is
 * accumulating evidence against that. After a grace window (injuries happen)
 * the expected rating decays toward 50 in proportion to minutes missed,
 * bottoming out at MAX_ABSENCE_DECAY of the distance to neutral.
 */
export const ABSENCE_GRACE_EVENTS = 4
export const ABSENCE_MINUTES_PER_EVENT = 30
export const MAX_ABSENCE_DECAY = 0.5

/**
 * FPL statuses meaning the player is effectively out of the league
 * (transferred/unavailable/ineligible). Their historical baseline is ignored
 * entirely — a player who left should not sit atop the rankings on memory.
 */
export const DEPARTED_STATUSES: ReadonlySet<string> = new Set(["u", "n"])

/** Distributions need at least this many samples and non-zero variance. */
export const MIN_DISTRIBUTION_SAMPLES = 8

/**
 * Target distribution for the final overall calibration (see calibrate.ts):
 * quantile within position cohort → calibrated rating. Tuned so the best
 * player in each position sits ~95, the top ~1% at ~91, and the top 5% in
 * the mid-to-high 80s. This is the knob for "how FIFA should the numbers
 * feel" — adjust here, not in the engine.
 */
export const OVERALL_CALIBRATION_ANCHORS: ReadonlyArray<{
  q: number
  r: number
}> = [
  { q: 0.0, r: 40 },
  { q: 0.25, r: 55 },
  { q: 0.5, r: 65 },
  { q: 0.7, r: 73 },
  { q: 0.85, r: 80 },
  { q: 0.95, r: 86 },
  { q: 0.99, r: 91 },
  { q: 1.0, r: 95 },
]

/** Minimum cohort size for a stable per-position calibration curve. */
export const MIN_CALIBRATION_COHORT = 12

/**
 * Bump when the rating algorithm changes so stored snapshots for the current
 * gameweek are recomputed instead of served stale.
 * v2: per-position overall calibration pass (calibrate.ts).
 * v3: departed-status baseline exclusion, absence decay, 900-minute full
 *     assessment.
 */
export const RATINGS_ALGO_VERSION = 3
