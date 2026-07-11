import type { CSSProperties } from "react"

export type CardFoilTier =
  | "purple"
  | "gold"
  | "silver"
  | "bronze"
  | "grey"
  | "brown"

export type CardFoilSkin = {
  /** CSS background gradient for the card face. */
  background: string
  /** Border / frame accent colour. */
  frame: string
  /** Primary text colour on the card. */
  text: string
  /** Secondary / stat label colour. */
  mutedText: string
  /** Holo overlay tint (hex). */
  holoTint: string
  /** Holo overlay opacity 0–100. Zero = matte / no reflection. */
  holoOpacity: number
  /** Whether sparkle animation is enabled. */
  sparkles: boolean
  /** Box shadow accent for depth. */
  shadow: string
}

/**
 * Card background tiers (independent of rating text colour bands):
 * purple 90+, gold 80+, silver 70+, bronze 60+, grey 50+ (matte), brown ≤49 (matte).
 */
export function getCardFoilTier(overall: number): CardFoilTier {
  if (overall >= 90) return "purple"
  if (overall >= 80) return "gold"
  if (overall >= 70) return "silver"
  if (overall >= 60) return "bronze"
  if (overall >= 50) return "grey"
  return "brown"
}

const FOIL_SKINS: Record<CardFoilTier, CardFoilSkin> = {
  purple: {
    background:
      "linear-gradient(165deg, #1a0f4a 0%, #2d1b8f 35%, #1e3a8a 70%, #312e81 100%)",
    frame: "#c4b5fd",
    text: "#f5f3ff",
    mutedText: "#c4b5fd",
    holoTint: "#9333ea",
    holoOpacity: 55,
    /** Sparkles gated in the card at overall ≥ 94. */
    sparkles: false,
    shadow:
      "0 0 0 1px rgba(196,181,253,0.35), 0 20px 40px -12px rgba(49,46,129,0.55), 0 0 24px rgba(147,51,234,0.25)",
  },
  gold: {
    background:
      "linear-gradient(165deg, #3d2a08 0%, #6b4a0a 30%, #a16207 65%, #451a03 100%)",
    frame: "#fcd34d",
    text: "#fffbeb",
    mutedText: "#fde68a",
    holoTint: "#f59e0b",
    holoOpacity: 45,
    sparkles: false,
    shadow:
      "0 0 0 1px rgba(252,211,77,0.4), 0 20px 40px -12px rgba(69,26,3,0.5), 0 0 16px rgba(245,158,11,0.2)",
  },
  silver: {
    background:
      "linear-gradient(165deg, #374151 0%, #6b7280 40%, #9ca3af 75%, #4b5563 100%)",
    frame: "#e5e7eb",
    text: "#f9fafb",
    mutedText: "#d1d5db",
    holoTint: "#9ca3af",
    holoOpacity: 35,
    sparkles: false,
    shadow:
      "0 0 0 1px rgba(229,231,235,0.4), 0 20px 40px -12px rgba(31,41,55,0.45), 0 0 12px rgba(156,163,175,0.2)",
  },
  bronze: {
    background:
      "linear-gradient(165deg, #431407 0%, #7c2d12 35%, #b45309 70%, #431407 100%)",
    frame: "#fdba74",
    text: "#fff7ed",
    mutedText: "#fed7aa",
    holoTint: "#ea580c",
    holoOpacity: 28,
    sparkles: false,
    shadow:
      "0 0 0 1px rgba(253,186,116,0.3), 0 20px 40px -12px rgba(67,20,7,0.45)",
  },
  grey: {
    background:
      "linear-gradient(165deg, #27272a 0%, #3f3f46 45%, #52525b 75%, #27272a 100%)",
    frame: "#a1a1aa",
    text: "#fafafa",
    mutedText: "#a1a1aa",
    holoTint: "#71717a",
    holoOpacity: 0,
    sparkles: false,
    shadow:
      "0 0 0 1px rgba(161,161,170,0.25), 0 20px 40px -12px rgba(24,24,27,0.5)",
  },
  brown: {
    background:
      "linear-gradient(165deg, #1c1410 0%, #3b2416 40%, #5c3a21 75%, #1c1410 100%)",
    frame: "#a16207",
    text: "#fef3c7",
    mutedText: "#d6a56a",
    holoTint: "#78350f",
    holoOpacity: 0,
    sparkles: false,
    shadow:
      "0 0 0 1px rgba(161,98,7,0.25), 0 20px 40px -12px rgba(28,20,16,0.55)",
  },
}

export function getCardFoilSkin(overall: number): CardFoilSkin {
  return FOIL_SKINS[getCardFoilTier(overall)]
}

export function cardFoilCssVars(overall: number): CSSProperties {
  const skin = getCardFoilSkin(overall)
  return {
    "--card-bg": skin.background,
    "--card-frame": skin.frame,
    "--card-text": skin.text,
    "--card-muted": skin.mutedText,
    "--card-holo-tint": skin.holoTint,
    "--card-holo-opacity": String(skin.holoOpacity / 100),
    "--card-shadow": skin.shadow,
  } as CSSProperties
}
