export type PointsChipTone =
  "grey" | "red" | "orange" | "green" | "blue" | "purple"

/**
 * Gameweek points chip colours. Thresholds share the lower theme for values
 * in between: 0–1 grey/red, 2 orange, 3–5 green, 6–9 blue, 10+ purple.
 *
 * 0 points with no minutes stays grey; 0–1 with minutes played is red.
 */
export function getPointsChipTone(
  points: number,
  minutes: number | null | undefined
): PointsChipTone {
  if (points >= 10) return "purple"
  if (points >= 6) return "blue"
  if (points >= 3) return "green"
  if (points >= 2) return "orange"
  if ((minutes ?? 0) > 0) return "red"
  return "grey"
}

export const POINTS_CHIP_CLASS: Record<PointsChipTone, string> = {
  grey: "bg-zinc-500",
  red: "bg-red-600",
  orange: "bg-orange-500",
  green: "bg-green-600",
  blue: "bg-blue-500",
  purple: "bg-purple-600",
}
