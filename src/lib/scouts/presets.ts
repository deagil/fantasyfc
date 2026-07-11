import type { PositionFilterId } from "@/lib/fpl/players"

export type ScoutSortId =
  | "overall"
  | "points"
  | "bonus"
  | "defcon"
  | "goal_involvements"
  | "gi_per_90"

export type ScoutPreset = {
  slug: string
  name: string
  subtitle: string
  positionFilter: PositionFilterId
  sort: ScoutSortId
  featured?: boolean
  /** Show as a secondary tile on the Transfers hub (max 4). */
  hub?: boolean
  /** Exclusive max ownership %, e.g. 10 → under 10%. */
  maxOwnership?: number
  /** Exclusive max price in £m, e.g. 6 → under £6.0m. */
  maxPriceMillions?: number
  /** Inclusive max season minutes (super-sub style). */
  maxMinutes?: number
  /** Inclusive max league starts. */
  maxStarts?: number
  /** Minimum goals + assists. */
  minGoalInvolvements?: number
  /** Minimum season defensive contribution actions. */
  minDefensiveContribution?: number
}

export const SCOUT_PRESETS: ScoutPreset[] = [
  {
    slug: "any-position",
    name: "Any Position",
    subtitle: "First team quality",
    positionFilter: "all",
    sort: "overall",
    featured: true,
  },
  {
    slug: "bonus-hunters",
    name: "Bonus Hunters",
    subtitle: "BPS magnets",
    positionFilter: "all",
    sort: "bonus",
    hub: true,
  },
  {
    slug: "defcon-giants",
    name: "Defcon Giants",
    subtitle: "Defensive contribution",
    positionFilter: "all",
    sort: "defcon",
    minDefensiveContribution: 1,
    hub: true,
  },
  {
    slug: "differentials",
    name: "Differentials",
    subtitle: "Under 10% owned",
    positionFilter: "all",
    sort: "overall",
    maxOwnership: 10,
    hub: true,
  },
  {
    slug: "budget-gems",
    name: "Budget Gems",
    subtitle: "Best under £6.0m",
    positionFilter: "all",
    sort: "overall",
    maxPriceMillions: 6,
    hub: true,
  },
  {
    slug: "super-subs",
    name: "Super Subs",
    subtitle: "Impact off the bench",
    positionFilter: "all",
    sort: "gi_per_90",
    maxMinutes: 1200,
    maxStarts: 12,
    minGoalInvolvements: 3,
  },
  {
    slug: "forwards",
    name: "Forwards",
    subtitle: "Attacking options",
    positionFilter: "FWD",
    sort: "points",
  },
  {
    slug: "midfielders",
    name: "Midfielders",
    subtitle: "Creative outlets",
    positionFilter: "MID",
    sort: "points",
  },
  {
    slug: "defenders",
    name: "Defenders",
    subtitle: "Defensive cover",
    positionFilter: "DEF",
    sort: "points",
  },
  {
    slug: "goalkeepers",
    name: "Goalkeepers",
    subtitle: "Between the sticks",
    positionFilter: "GKP",
    sort: "points",
  },
]

/** Old slugs that still resolve to a current preset. */
const SCOUT_SLUG_ALIASES: Record<string, string> = {
  "most-bonus": "bonus-hunters",
}

const scoutPresetsBySlug = new Map(
  SCOUT_PRESETS.map((preset) => [preset.slug, preset])
)

export function getScoutPreset(slug: string): ScoutPreset | undefined {
  const resolved = SCOUT_SLUG_ALIASES[slug] ?? slug
  return scoutPresetsBySlug.get(resolved)
}

export function getFeaturedScoutPreset(): ScoutPreset {
  return SCOUT_PRESETS.find((preset) => preset.featured) ?? SCOUT_PRESETS[0]
}

export function getSecondaryScoutPresets(): ScoutPreset[] {
  return SCOUT_PRESETS.filter((preset) => !preset.featured)
}

/** Secondary presets pinned to the Transfers hub tile grid. */
export function getHubScoutPresets(): ScoutPreset[] {
  return SCOUT_PRESETS.filter((preset) => preset.hub)
}
