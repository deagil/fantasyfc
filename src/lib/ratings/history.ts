import { computeRatings } from "@/lib/ratings/engine"
import type {
  CategoryId,
  EnginePlayer,
  ExpectedBaseline,
  SeasonHistoryInput,
} from "@/lib/ratings/model"
import { deriveHistoryStats } from "@/lib/ratings/stats"

export const MAX_BASELINE_SEASONS = 3

/** Minutes at which a historical season carries full baseline weight. */
const FULL_SEASON_MINUTES = 900

/**
 * Turn stored `history_past` rows into per-player expected baselines.
 *
 * Each season is rated as its own cohort with the same engine as the current
 * season (event = null → full-season assessment). A player's baseline is then
 * a recency-weighted average of their last MAX_BASELINE_SEASONS season
 * ratings, with each season additionally weighted by minutes played so an
 * injury-wrecked 90-minute season doesn't drag an established player's
 * baseline toward 50.
 *
 * Seasons are seeded from vaastav players_raw.csv dumps (see vaastav.ts), so
 * each historical cohort is the entire league that year — percentiles are
 * unbiased by who is still in the game today.
 */
export function computeExpectedBaselines(
  rows: readonly SeasonHistoryInput[]
): Map<number, ExpectedBaseline> {
  const seasonNames = [...new Set(rows.map((row) => row.seasonName))]
    .sort()
    .reverse()
    .slice(0, MAX_BASELINE_SEASONS)

  type SeasonRating = {
    seasonName: string
    recencyWeight: number
    minutesWeight: number
    overall: number
    categories: Partial<Record<CategoryId, number>>
  }

  const perPlayer = new Map<number, SeasonRating[]>()

  seasonNames.forEach((seasonName, index) => {
    const seasonRows = rows.filter((row) => row.seasonName === seasonName)
    const players: EnginePlayer[] = seasonRows.map((row) => ({
      id: row.playerCode,
      code: row.playerCode,
      webName: row.webName,
      elementType: row.elementType,
      minutes: Number(row.stats.minutes) || 0,
      stats: deriveHistoryStats(row.stats),
    }))

    const ratings = computeRatings(players, { event: null })

    for (const rating of ratings) {
      const categories: Partial<Record<CategoryId, number>> = {}
      for (const [categoryId, category] of Object.entries(rating.categories)) {
        categories[categoryId as CategoryId] = category.score
      }

      const list = perPlayer.get(rating.code) ?? []
      list.push({
        seasonName,
        recencyWeight: seasonNames.length - index,
        minutesWeight: Math.min(1, rating.minutes / FULL_SEASON_MINUTES),
        overall: rating.overall,
        categories,
      })
      perPlayer.set(rating.code, list)
    }
  })

  const baselines = new Map<number, ExpectedBaseline>()

  for (const [code, seasons] of perPlayer) {
    let overallWeighted = 0
    let overallWeightTotal = 0
    const categoryWeighted: Partial<Record<CategoryId, number>> = {}
    const categoryWeightTotal: Partial<Record<CategoryId, number>> = {}

    for (const season of seasons) {
      const weight = season.recencyWeight * Math.max(0.1, season.minutesWeight)
      overallWeighted += season.overall * weight
      overallWeightTotal += weight

      for (const [categoryId, score] of Object.entries(season.categories) as [
        CategoryId,
        number,
      ][]) {
        categoryWeighted[categoryId] =
          (categoryWeighted[categoryId] ?? 0) + score * weight
        categoryWeightTotal[categoryId] =
          (categoryWeightTotal[categoryId] ?? 0) + weight
      }
    }

    if (overallWeightTotal <= 0) {
      continue
    }

    const categories: Partial<Record<CategoryId, number>> = {}
    for (const [categoryId, weighted] of Object.entries(categoryWeighted) as [
      CategoryId,
      number,
    ][]) {
      const total = categoryWeightTotal[categoryId] ?? 0
      if (total > 0) {
        categories[categoryId] = Math.round(weighted / total)
      }
    }

    baselines.set(code, {
      overall: Math.round(overallWeighted / overallWeightTotal),
      categories,
      seasonsUsed: seasons.length,
      latestSeason: seasons[0].seasonName,
    })
  }

  return baselines
}
