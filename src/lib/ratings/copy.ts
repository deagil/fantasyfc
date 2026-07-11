import type { CategoryId } from "@/lib/ratings/model"

/** Three-letter tile label shown in the category grid. */
export const CATEGORY_SHORT_LABELS: Record<CategoryId, string> = {
  ATK: "ATK",
  PLY: "PLY",
  IMP: "IMP",
  DEF: "DEF",
  REL: "REL",
  FPL: "VAL",
  GKP: "GKP",
}

/** Full category name shown in the expanded breakdown. */
export const CATEGORY_TITLES: Record<CategoryId, string> = {
  ATK: "Attack",
  PLY: "Playmaking",
  IMP: "Impact",
  DEF: "Defence",
  REL: "Reliability",
  FPL: "Value",
  GKP: "Goalkeeping",
}

export const CATEGORY_DESCRIPTIONS: Record<CategoryId, string> = {
  ATK: "Finishing quality and attacking threat. Not rated for goalkeepers.",
  PLY: "Chance creation and creative output in the final third.",
  IMP: "All-round match influence and Fantasy points efficiency.",
  DEF: "Defensive actions, clean-sheet outcomes, and discipline.",
  REL: "Availability and playing time — rewards nailed-on starters.",
  FPL: "Points return relative to price. Bang for your buck.",
  GKP: "Shot stopping and goals prevented. Replaces Attack for keepers.",
}

const SUBCATEGORY_LABELS: Record<string, string> = {
  Goalscoring: "Goalscoring",
  Threat: "Threat",
  Creation: "Creation",
  Creativity: "Creativity",
  Influence: "Influence",
  Efficiency: "Efficiency",
  Actions: "Actions",
  Outcomes: "Outcomes",
  Discipline: "Discipline",
  PlayingTime: "Playing time",
  Market: "Market",
  ShotStopping: "Shot stopping",
  Conceding: "Conceding",
}

const STAT_LABELS: Record<string, string> = {
  xg_per_90: "xG / 90",
  goals_per_90: "Goals / 90",
  goals_scored: "Goals",
  penalties_missed: "Pens missed",
  threat_per_90: "Threat / 90",
  xgi_per_90: "xGI / 90",
  xa_per_90: "xA / 90",
  assists_per_90: "Assists / 90",
  assists: "Assists",
  creativity_per_90: "Creativity / 90",
  ict_per_90: "ICT / 90",
  bps_per_90: "BPS / 90",
  bonus_per_90: "Bonus / 90",
  points_per_game: "Pts / game",
  points_per_90: "Pts / 90",
  total_points: "Total pts",
  defcon_per_90: "Defcon / 90",
  cbi_per_90: "CBI / 90",
  tackles_per_90: "Tackles / 90",
  recoveries_per_90: "Recoveries / 90",
  clean_sheets_per_90: "CS / 90",
  xgc_per_90: "xGC / 90",
  yellow_per_90: "Yellows / 90",
  red_per_90: "Reds / 90",
  own_goals: "Own goals",
  minutes: "Minutes",
  starts: "Starts",
  starts_per_90: "Starts / 90",
  points_per_million: "Pts / £m",
  value_season: "Season value",
  value_form: "Form value",
  saves_per_90: "Saves / 90",
  saves: "Saves",
  penalties_saved: "Pens saved",
  goals_conceded_per_90: "GC / 90",
}

const STAT_DESCRIPTIONS: Record<string, string> = {
  xg_per_90: "Expected goals per 90 — quality of chances taken.",
  goals_per_90: "Actual goals scored per 90 minutes.",
  goals_scored: "Season goal total — rewards sustained output.",
  penalties_missed: "Penalties missed this season. Lower is better.",
  threat_per_90: "FPL ICT Threat per 90 — shots and box touches.",
  xgi_per_90: "Expected goal involvements (xG + xA) per 90.",
  xa_per_90: "Expected assists per 90 minutes.",
  assists_per_90: "Actual assists per 90 minutes.",
  assists: "Season assist total.",
  creativity_per_90: "FPL ICT Creativity per 90 — chances created.",
  ict_per_90: "Combined ICT Index per 90.",
  bps_per_90: "Bonus Points System score per 90.",
  bonus_per_90: "Bonus points awarded per 90.",
  points_per_game: "Fantasy points per appearance.",
  points_per_90: "Total fantasy points per 90.",
  total_points: "Season fantasy points total.",
  defcon_per_90: "FPL defensive contribution per 90.",
  cbi_per_90: "Clearances, blocks, and interceptions per 90.",
  tackles_per_90: "Tackles won per 90.",
  recoveries_per_90: "Ball recoveries per 90.",
  clean_sheets_per_90: "Clean sheet rate per 90.",
  xgc_per_90: "Expected goals conceded per 90. Lower is better.",
  yellow_per_90: "Yellow cards per 90. Lower is better.",
  red_per_90: "Red cards per 90. Lower is better.",
  own_goals: "Own goals scored. Lower is better.",
  minutes: "Minutes played this season.",
  starts: "League starts this season — rewards nailed-on selection.",
  starts_per_90: "Start rate per 90 minutes on the pitch.",
  points_per_million: "Season points divided by price in £m.",
  value_season: "FPL's season-long value metric.",
  value_form: "FPL's recent form value metric.",
  saves_per_90: "Saves made per 90.",
  saves: "Season save total.",
  penalties_saved: "Penalties saved this season.",
  goals_conceded_per_90: "Goals conceded per 90. Lower is better.",
}

export function getSubcategoryLabel(key: string): string {
  return SUBCATEGORY_LABELS[key] ?? formatPascalKey(key)
}

export function getStatLabel(key: string): string {
  return STAT_LABELS[key] ?? formatSnakeKey(key)
}

export function getStatDescription(key: string): string {
  return STAT_DESCRIPTIONS[key] ?? "Contributing stat in this sub-category."
}

function formatPascalKey(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2")
}

function formatSnakeKey(key: string): string {
  return key.replace(/_/g, " ")
}
