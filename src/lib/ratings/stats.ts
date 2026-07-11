import type {
  FplHistoryPastSeason,
  RatingsBootstrapElement,
} from "@/lib/ratings/model"

export function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function per90(total: number | null, minutes: number): number | null {
  if (total === null || minutes <= 0) {
    return null
  }
  return (total * 90) / minutes
}

/**
 * Derive the flat stat record the hierarchy references from a full bootstrap
 * element. Prefers the API's own per-90 fields where they exist.
 */
export function deriveBootstrapStats(
  el: RatingsBootstrapElement
): Record<string, number | null> {
  const minutes = toNum(el.minutes) ?? 0
  const totalPoints = toNum(el.total_points)
  const nowCost = toNum(el.now_cost)

  return {
    minutes,
    starts_per_90: toNum(el.starts_per_90),

    // Attack
    xg_per_90: toNum(el.expected_goals_per_90),
    goals_per_90: per90(toNum(el.goals_scored), minutes),
    goals_scored: toNum(el.goals_scored),
    penalties_missed: toNum(el.penalties_missed),
    threat_per_90: per90(toNum(el.threat), minutes),
    xgi_per_90: toNum(el.expected_goal_involvements_per_90),

    // Playmaking
    xa_per_90: toNum(el.expected_assists_per_90),
    assists_per_90: per90(toNum(el.assists), minutes),
    assists: toNum(el.assists),
    creativity_per_90: per90(toNum(el.creativity), minutes),

    // Impact
    ict_per_90: per90(toNum(el.ict_index), minutes),
    bps_per_90: per90(toNum(el.bps), minutes),
    bonus_per_90: per90(toNum(el.bonus), minutes),
    points_per_game: toNum(el.points_per_game),
    points_per_90: per90(totalPoints, minutes),
    total_points: totalPoints,

    // Defence
    defcon_per_90: toNum(el.defensive_contribution_per_90),
    cbi_per_90: per90(toNum(el.clearances_blocks_interceptions), minutes),
    tackles_per_90: per90(toNum(el.tackles), minutes),
    recoveries_per_90: per90(toNum(el.recoveries), minutes),
    clean_sheets_per_90: toNum(el.clean_sheets_per_90),
    xgc_per_90: toNum(el.expected_goals_conceded_per_90),
    yellow_per_90: per90(toNum(el.yellow_cards), minutes),
    red_per_90: per90(toNum(el.red_cards), minutes),
    own_goals: toNum(el.own_goals),

    // Goalkeeping
    saves_per_90: toNum(el.saves_per_90),
    saves: toNum(el.saves),
    penalties_saved: toNum(el.penalties_saved),
    goals_conceded_per_90: toNum(el.goals_conceded_per_90),

    // FPL value
    points_per_million:
      totalPoints !== null && nowCost !== null && nowCost > 0
        ? (totalPoints * 10) / nowCost
        : null,
    value_season: toNum(el.value_season),
    value_form: toNum(el.value_form),
  }
}

/**
 * Same derivation from a `history_past` season row. Everything is a season
 * total here, so all per-90s are computed from minutes. Stats FPL did not
 * track in a given season (xG pre-2022, defensive contribution pre-2025) come
 * out as all-zero across the cohort and are skipped by the engine's
 * zero-variance guard, with sibling weights renormalising.
 */
export function deriveHistoryStats(
  row: FplHistoryPastSeason
): Record<string, number | null> {
  const minutes = toNum(row.minutes) ?? 0
  const totalPoints = toNum(row.total_points)
  const endCost = toNum(row.end_cost)

  return {
    minutes,
    starts_per_90: per90(toNum(row.starts), minutes),

    xg_per_90: per90(toNum(row.expected_goals), minutes),
    goals_per_90: per90(toNum(row.goals_scored), minutes),
    goals_scored: toNum(row.goals_scored),
    penalties_missed: toNum(row.penalties_missed),
    threat_per_90: per90(toNum(row.threat), minutes),
    xgi_per_90: per90(toNum(row.expected_goal_involvements), minutes),

    xa_per_90: per90(toNum(row.expected_assists), minutes),
    assists_per_90: per90(toNum(row.assists), minutes),
    assists: toNum(row.assists),
    creativity_per_90: per90(toNum(row.creativity), minutes),

    ict_per_90: per90(toNum(row.ict_index), minutes),
    bps_per_90: per90(toNum(row.bps), minutes),
    bonus_per_90: per90(toNum(row.bonus), minutes),
    // Appearances are not recorded historically; the whole cohort is null so
    // the engine drops this stat and renormalises Efficiency.
    points_per_game: null,
    points_per_90: per90(totalPoints, minutes),
    total_points: totalPoints,

    defcon_per_90: per90(toNum(row.defensive_contribution), minutes),
    cbi_per_90: per90(toNum(row.clearances_blocks_interceptions), minutes),
    tackles_per_90: per90(toNum(row.tackles), minutes),
    recoveries_per_90: per90(toNum(row.recoveries), minutes),
    clean_sheets_per_90: per90(toNum(row.clean_sheets), minutes),
    xgc_per_90: per90(toNum(row.expected_goals_conceded), minutes),
    yellow_per_90: per90(toNum(row.yellow_cards), minutes),
    red_per_90: per90(toNum(row.red_cards), minutes),
    own_goals: toNum(row.own_goals),

    saves_per_90: per90(toNum(row.saves), minutes),
    saves: toNum(row.saves),
    penalties_saved: toNum(row.penalties_saved),
    goals_conceded_per_90: per90(toNum(row.goals_conceded), minutes),

    points_per_million:
      totalPoints !== null && endCost !== null && endCost > 0
        ? (totalPoints * 10) / endCost
        : null,
    value_season: null,
    value_form: null,
  }
}
