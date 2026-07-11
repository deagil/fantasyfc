import type { TrophyMedal } from "@/lib/trophies/types"

/**
 * Hub trophy visual switch.
 * - `"award"` — Apple Watch–style medal discs (gold / silver / bronze). Current default.
 * - `"modular"` — procedural Borderlands mashups seeded by leagueId.
 *
 * Flip this to restore modular trophies without deleting the parts catalog.
 * See `src/lib/trophies/README.md`.
 */
export type TrophyVisualStyle = "award" | "modular"
export const TROPHY_VISUAL_STYLE: TrophyVisualStyle = "award"

export type TrophyBodyId = "urn" | "bowl" | "chalice"
export type TrophyHandlesId = "ears" | "none" | "wings"
export type TrophyStemId = "short" | "ringed" | "tall"
export type TrophyBaseId = "stepped" | "disc" | "plinth"

export type TrophyParts = {
  body: TrophyBodyId
  handles: TrophyHandlesId
  stem: TrophyStemId
  base: TrophyBaseId
}

export const trophyBodyIds: TrophyBodyId[] = ["urn", "bowl", "chalice"]
export const trophyHandlesIds: TrophyHandlesId[] = ["ears", "none", "wings"]
export const trophyStemIds: TrophyStemId[] = ["short", "ringed", "tall"]
export const trophyBaseIds: TrophyBaseId[] = ["stepped", "disc", "plinth"]

export const medalPalette: Record<
  TrophyMedal,
  { fill: string; stroke: string }
> = {
  gold: {
    fill: "#efdc4a",
    stroke: "color-mix(in oklab, var(--pl-purple) 62%, #efdc4a)",
  },
  silver: {
    fill: "#d8d8e4",
    stroke: "color-mix(in oklab, var(--pl-purple) 55%, #d8d8e4)",
  },
  bronze: {
    fill: "#ff8f3d",
    stroke: "color-mix(in oklab, var(--pl-purple) 55%, #ff8f3d)",
  },
}

/** Stable 32-bit hash from a league id. */
export function hashLeagueId(leagueId: number): number {
  let hash = leagueId | 0
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d)
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b)
  hash ^= hash >>> 16
  return hash >>> 0
}

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickVariant<T extends string>(rng: () => number, variants: readonly T[]): T {
  const index = Math.floor(rng() * variants.length)
  return variants[index] ?? variants[0]
}

/** Deterministic part mashup from league id. Medal does not affect shape. */
export function resolveTrophyParts(leagueId: number): TrophyParts {
  const rng = mulberry32(hashLeagueId(leagueId))
  return {
    body: pickVariant(rng, trophyBodyIds),
    handles: pickVariant(rng, trophyHandlesIds),
    stem: pickVariant(rng, trophyStemIds),
    base: pickVariant(rng, trophyBaseIds),
  }
}
