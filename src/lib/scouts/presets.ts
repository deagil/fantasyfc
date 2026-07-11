import type { PositionFilterId } from "@/lib/fpl/players"

export type ScoutSortId = "overall" | "points" | "bonus"

export type ScoutPreset = {
  slug: string
  name: string
  subtitle: string
  positionFilter: PositionFilterId
  sort: ScoutSortId
  featured?: boolean
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
  {
    slug: "most-bonus",
    name: "Most bonus",
    subtitle: "Bonus point hunters",
    positionFilter: "all",
    sort: "bonus",
  },
]

const scoutPresetsBySlug = new Map(
  SCOUT_PRESETS.map((preset) => [preset.slug, preset])
)

export function getScoutPreset(slug: string): ScoutPreset | undefined {
  return scoutPresetsBySlug.get(slug)
}

export function getFeaturedScoutPreset(): ScoutPreset {
  return SCOUT_PRESETS.find((preset) => preset.featured) ?? SCOUT_PRESETS[0]
}

export function getSecondaryScoutPresets(): ScoutPreset[] {
  return SCOUT_PRESETS.filter((preset) => !preset.featured)
}
