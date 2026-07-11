// Shared types for the FIFA-style player rating system.
// Pure types only — safe to import from client, server, and tests.

export type CategoryId = "ATK" | "PLY" | "IMP" | "DEF" | "REL" | "FPL" | "GKP"

export type RatingElementType = 1 | 2 | 3 | 4

export type StatSpec = {
  /** Key into the derived stat record (see stats.ts). */
  key: string
  weight: number
  /** Invert the percentile — e.g. yellow cards, xGC. */
  lowerIsBetter?: boolean
}

export type SubCategorySpec = {
  weight: number
  stats: StatSpec[]
}

export type CategorySpec = {
  sub: Record<string, SubCategorySpec>
}

export type RatingHierarchy = Partial<Record<CategoryId, CategorySpec>>

/** Normalised input to the rating engine — current season or a historical one. */
export type EnginePlayer = {
  id: number
  code: number
  webName: string
  elementType: RatingElementType
  minutes: number
  /** FPL availability status ("a", "d", "i", "s", "u", "n"); null if unknown. */
  status?: string | null
  stats: Record<string, number | null>
}

export type RatingConfidence = "low" | "medium" | "high"

export type StatScore = {
  value: number | null
  percentile: number | null
  rating: number | null
  weight: number
  lowerIsBetter: boolean
}

export type SubScore = {
  score: number | null
  weight: number
  stats: Record<string, StatScore>
}

export type CategoryScore = {
  /** Damped 10–100 category score. */
  score: number
  weight: number
  sub: Record<string, SubScore>
}

/** Current-season (or single-historical-season) rating for one player. */
export type PlayerRating = {
  id: number
  code: number
  webName: string
  elementType: RatingElementType
  minutes: number
  status: string | null
  gamesPlayed: number
  /** 0–1: how fully assessed this player is (minutes vs. assessment threshold). */
  damping: number
  unassessed: boolean
  confidence: RatingConfidence
  overall: number
  categories: Partial<Record<CategoryId, CategoryScore>>
}

/** Recency-weighted multi-season baseline ("what we expect from this player"). */
export type ExpectedBaseline = {
  overall: number
  categories: Partial<Record<CategoryId, number>>
  seasonsUsed: number
  latestSeason: string
}

export type RatingTrend =
  | "overperforming"
  | "underperforming"
  | "performing_as_expected"
  | "early_season_variance"
  | "preseason"
  | "no_baseline"

export type BlendedCategoryScore = CategoryScore & {
  current: number
  expected: number | null
}

/** Final blended rating: current form + historical expectation. */
export type PlayerRatingResult = Omit<PlayerRating, "categories" | "overall"> & {
  /** Blended headline rating. */
  overall: number
  currentOverall: number
  expectedOverall: number | null
  performanceGap: number | null
  trend: RatingTrend
  categories: Partial<Record<CategoryId, BlendedCategoryScore>>
}

/** Compact shape sent to the client for list views. */
export type PlayerRatingSummary = {
  id: number
  code: number
  webName: string
  elementType: RatingElementType
  overall: number
  currentOverall: number
  expectedOverall: number | null
  performanceGap: number | null
  trend: RatingTrend
  confidence: RatingConfidence
  unassessed: boolean
  categories: Partial<Record<CategoryId, number>>
}

export type PlayerRatingsPayload = {
  season: string
  event: number
  computedAt: string
  ratings: PlayerRatingSummary[]
}

/**
 * Raw bootstrap element fields the rating system consumes.
 * The FPL API serialises many numeric stats as strings.
 */
export type RatingsBootstrapElement = {
  id: number
  code: number
  web_name: string
  element_type: RatingElementType
  status: string
  now_cost: number
  minutes: number
  starts: number
  goals_scored: number
  assists: number
  total_points: number
  bonus: number
  bps: number
  clean_sheets: number
  goals_conceded: number
  own_goals: number
  penalties_saved: number
  penalties_missed: number
  yellow_cards: number
  red_cards: number
  saves: number
  clearances_blocks_interceptions: number
  recoveries: number
  tackles: number
  defensive_contribution: number
  points_per_game: string
  value_form: string
  value_season: string
  influence: string
  creativity: string
  threat: string
  ict_index: string
  expected_goals: string
  expected_assists: string
  expected_goal_involvements: string
  expected_goals_conceded: string
  expected_goals_per_90: number
  expected_assists_per_90: number
  expected_goal_involvements_per_90: number
  expected_goals_conceded_per_90: number
  goals_conceded_per_90: number
  saves_per_90: number
  starts_per_90: number
  clean_sheets_per_90: number
  defensive_contribution_per_90: number
}

/** One row of an element-summary `history_past` entry (per-season aggregates). */
export type FplHistoryPastSeason = {
  season_name: string
  element_code: number
  start_cost: number
  end_cost: number
  total_points: number
  minutes: number
  goals_scored: number
  assists: number
  clean_sheets: number
  goals_conceded: number
  own_goals: number
  penalties_saved: number
  penalties_missed: number
  yellow_cards: number
  red_cards: number
  saves: number
  bonus: number
  bps: number
  influence: string
  creativity: string
  threat: string
  ict_index: string
  clearances_blocks_interceptions: number
  recoveries: number
  tackles: number
  defensive_contribution: number
  starts: number
  expected_goals: string
  expected_assists: string
  expected_goal_involvements: string
  expected_goals_conceded: string
}

export type SeasonHistoryInput = {
  playerCode: number
  webName: string
  elementType: RatingElementType
  seasonName: string
  stats: FplHistoryPastSeason
}
