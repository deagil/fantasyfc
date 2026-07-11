/** FIFA-style colour bands for 10–100 rating scores. */

export type RatingTone = "elite" | "good" | "fair" | "poor" | "bad"

export function getRatingTone(rating: number): RatingTone {
  if (rating >= 85) return "elite"
  if (rating >= 75) return "good"
  if (rating >= 65) return "fair"
  if (rating >= 50) return "poor"
  return "bad"
}

const TEXT_CLASS: Record<RatingTone, string> = {
  elite: "text-rating-elite",
  good: "text-rating-good",
  fair: "text-rating-fair",
  poor: "text-rating-poor",
  bad: "text-rating-bad",
}

const SURFACE_CLASS: Record<RatingTone, string> = {
  elite: "bg-rating-elite/12",
  good: "bg-rating-good/12",
  fair: "bg-rating-fair/12",
  poor: "bg-rating-poor/12",
  bad: "bg-rating-bad/12",
}

export function ratingTextClassName(rating: number): string {
  return TEXT_CLASS[getRatingTone(rating)]
}

export function ratingSurfaceClassName(rating: number): string {
  return SURFACE_CLASS[getRatingTone(rating)]
}
