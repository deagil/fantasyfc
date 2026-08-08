import type { FixtureRun } from "@/lib/fixtures/upcoming"
import { formatPlayerPrice, formatPlayerStatus } from "@/lib/fpl/players"
import type { FplElement, FplElementTypeId } from "@/lib/fpl/types"
import { getStatLabel } from "@/lib/ratings/copy"
import type {
  BlendedCategoryScore,
  CategoryId,
  PlayerRatingSummary,
  PlayerSeasonHistoryEntry,
} from "@/lib/ratings/model"

/** Matches the rating engine's cohort floor so comparisons line up with scores. */
export const SUMMARY_COHORT_MIN_MINUTES = 90

/** Percentile above which a metric reads as a strength, and below as a concern. */
const STRONG_PERCENTILE = 70
const WEAK_PERCENTILE = 30

const STRENGTH_RATING_FLOOR = 72
const WEAKNESS_RATING_CEILING = 45
/**
 * Chips quote a percentile, so the percentile has to back the claim on its own.
 * The rating curve is deliberately non-linear, which can otherwise leave a chip
 * reading "concern" next to a mid-table percentile.
 */
const STRENGTH_PERCENTILE_FLOOR = 0.75
const WEAKNESS_PERCENTILE_CEILING = 0.25
/** Ignore leaf stats that barely move the overall (position × sub × stat weight). */
const CHIP_MIN_EFFECTIVE_WEIGHT = 0.008
const MAX_CHIPS_PER_SIDE = 2

/** Below this many qualifying players the quantiles are too noisy to draw. */
export const RANGE_MIN_SAMPLES = 12

export type SummaryTone = "positive" | "neutral" | "negative"

export type MetricBandId = "poor" | "typical" | "strong" | "elite"

/** The plain-language verdict attached to each band of the cohort. */
export const METRIC_BAND_LABELS: Record<MetricBandId, string> = {
  poor: "Below par",
  typical: "Average",
  strong: "Good",
  elite: "Excellent",
}

export const METRIC_BAND_ORDER: MetricBandId[] = [
  "poor",
  "typical",
  "strong",
  "elite",
]

/**
 * A metric plotted on four equal-width visual bands. Band edges are meaningful
 * cutoffs in the metric's own units (rating tones for ability; cohort
 * percentiles for everything else) — not population-proportional widths — so
 * "Excellent" stays rare while the bar stays readable.
 */
export type MetricRange = {
  value: number
  /**
   * 0–100 position on the equal-width bar. Mapped piecewise within each band
   * so a player near a boundary sits near the colour edge, not by raw rank.
   */
  markerPercent: number
  /** Values at the three band boundaries, ascending. */
  boundaries: [number, number, number]
  bandId: MetricBandId
  decimals: number
  unit: string
}

/**
 * Ability (overall rating) band edges, aligned with rating colour tones:
 * fair ≥65, good ≥76, elite/purple ≥90. Equal bar segments keep purple readable
 * even though 90+ players are a tiny slice of the cohort.
 */
export const ABILITY_BAND_BOUNDARIES: [number, number, number] = [65, 76, 90]

/** Practical floor/ceiling for overall ratings when placing the marker. */
const ABILITY_SCALE_MIN = 40
const ABILITY_SCALE_MAX = 99

/**
 * Cohort percentile cutoffs for non-rating metrics. Elite is the top 10% so
 * "Excellent" means exceptional, not merely top-quartile.
 */
const COHORT_BAND_PERCENTILES: [number, number, number] = [0.25, 0.5, 0.9]

const BAND_TONE: Record<MetricBandId, SummaryTone> = {
  poor: "negative",
  typical: "neutral",
  strong: "positive",
  elite: "positive",
}

export type SummaryMetricId =
  | "ability"
  | "trajectory"
  | "value"
  | "returns"
  | "minutes"

export type SummaryMetric = {
  id: SummaryMetricId
  label: string
  value: string
  /** Secondary figure shown muted beside the value, e.g. "30 starts". */
  valueNote: string | null
  /**
   * Fallback context line, only used when there is no range to draw. With a
   * range the band label beside the title says the same thing in one word.
   */
  detail: string | null
  tone: SummaryTone
  /** 0–100 position-cohort percentile, or null when there is no comparison. */
  percentile: number | null
  /** Banded cohort range; null when the cohort is too small to band. */
  range: MetricRange | null
}

export type SummaryChip = {
  id: string
  label: string
  /** Cohort percentile rendered as an ordinal, e.g. "94th". */
  detail: string
  kind: "strength" | "concern"
}

export type SummaryAvailability = {
  label: string
  note: string | null
  tone: SummaryTone
}

export type ScoutSummary = {
  headline: string
  /** Names the comparison group behind every band, e.g. "vs 212 midfielders". */
  cohortCaption: string
  availability: SummaryAvailability | null
  metrics: SummaryMetric[]
  chips: SummaryChip[]
  fixtures: FixtureRun | null
  history: PlayerSeasonHistoryEntry[]
}

const POSITION_NOUN: Record<FplElementTypeId, string> = {
  1: "keeper",
  2: "defender",
  3: "midfielder",
  4: "forward",
}

const POSITION_PLURAL: Record<FplElementTypeId, string> = {
  1: "keepers",
  2: "defenders",
  3: "midfielders",
  4: "forwards",
}

function parseNumber(value: string): number | null {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function pointsPerMillion(player: FplElement): number | null {
  if (player.now_cost <= 0) {
    return null
  }
  return (player.total_points * 10) / player.now_cost
}

/**
 * A 0–100 percentile as a display ordinal, clamped to 1st–99th. Nobody is in
 * the "100th percentile", and mid-rank rounds there for the top of a large
 * cohort.
 */
export function formatPercentile(percentile: number): string {
  return ordinal(Math.min(99, Math.max(1, percentile)))
}

export function ordinal(value: number): string {
  const rounded = Math.round(value)
  const lastTwo = rounded % 100
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${rounded}th`
  }

  switch (rounded % 10) {
    case 1:
      return `${rounded}st`
    case 2:
      return `${rounded}nd`
    case 3:
      return `${rounded}rd`
    default:
      return `${rounded}th`
  }
}

/**
 * Mid-rank percentile: the share of the cohort below the value plus half the
 * ties. Halving ties stops a large cluster on the same value (e.g. every bench
 * player on zero goals) from all reading as better than each other.
 */
export function percentileOf(
  sortedValues: readonly number[],
  value: number
): number | null {
  if (sortedValues.length === 0) {
    return null
  }

  let below = 0
  let ties = 0
  for (const candidate of sortedValues) {
    if (candidate < value) {
      below += 1
    } else if (candidate === value) {
      ties += 1
    }
  }

  return ((below + ties / 2) / sortedValues.length) * 100
}

/** Linearly interpolated quantile over an ascending array. */
export function quantile(
  sortedValues: readonly number[],
  q: number
): number | null {
  if (sortedValues.length === 0) {
    return null
  }

  const position = (sortedValues.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) {
    return sortedValues[lower]
  }

  return (
    sortedValues[lower] +
    (sortedValues[upper] - sortedValues[lower]) * (position - lower)
  )
}

export function formatRangeValue(value: number, decimals: number): string {
  return decimals === 0
    ? Math.round(value).toLocaleString()
    : value.toFixed(decimals)
}

export function bandIdForBoundaries(
  value: number,
  boundaries: readonly [number, number, number]
): MetricBandId {
  const [low, mid, high] = boundaries
  if (value >= high) {
    return "elite"
  }
  if (value >= mid) {
    return "strong"
  }
  if (value >= low) {
    return "typical"
  }
  return "poor"
}

/**
 * Place `value` on an equal-width four-band bar. Each band owns 25% of the
 * track; progress within a band is linear between that band's value edges.
 */
export function markerPercentForBands(
  value: number,
  boundaries: readonly [number, number, number],
  scaleMin: number,
  scaleMax: number
): number {
  const [b0, b1, b2] = boundaries
  const edges = [scaleMin, b0, b1, b2, scaleMax]

  for (let index = 0; index < 4; index += 1) {
    const start = edges[index]
    const end = edges[index + 1]
    if (value > end && index < 3) {
      continue
    }

    const span = end - start
    const t = span <= 0 ? 1 : Math.min(1, Math.max(0, (value - start) / span))
    return Math.min(100, Math.max(0, (index + t) * 25))
  }

  return 100
}

export type BuildMetricRangeOptions = {
  unit: string
  decimals: number
  /**
   * Fixed value boundaries for the three colour edges. When omitted, boundaries
   * come from the cohort at {@link COHORT_BAND_PERCENTILES}.
   */
  boundaries?: readonly [number, number, number]
  /** Inclusive floor used when interpolating the below-par band. */
  scaleMin?: number
  /** Inclusive ceiling used when interpolating the excellent band. */
  scaleMax?: number
}

/**
 * Build an equal-width banded range for a player value. Ability passes fixed
 * rating-tone boundaries; other metrics derive edges from the cohort so the
 * labels stay in real units while elite stays the top decile.
 */
export function buildMetricRange(
  sortedValues: readonly number[],
  value: number | null,
  { unit, decimals, boundaries: fixedBoundaries, scaleMin, scaleMax }: BuildMetricRangeOptions
): MetricRange | null {
  if (value === null || sortedValues.length < RANGE_MIN_SAMPLES) {
    return null
  }

  let boundaries: [number, number, number]
  if (fixedBoundaries) {
    boundaries = [fixedBoundaries[0], fixedBoundaries[1], fixedBoundaries[2]]
  } else {
    const low = quantile(sortedValues, COHORT_BAND_PERCENTILES[0])
    const mid = quantile(sortedValues, COHORT_BAND_PERCENTILES[1])
    const high = quantile(sortedValues, COHORT_BAND_PERCENTILES[2])
    if (low === null || mid === null || high === null || high <= low) {
      return null
    }
    boundaries = [low, mid, high]
  }

  const floor = scaleMin ?? sortedValues[0]
  const ceiling = scaleMax ?? sortedValues[sortedValues.length - 1]
  if (ceiling <= floor) {
    return null
  }

  return {
    value,
    markerPercent: markerPercentForBands(value, boundaries, floor, ceiling),
    boundaries,
    bandId: bandIdForBoundaries(value, boundaries),
    decimals,
    unit,
  }
}

export function medianOf(sortedValues: readonly number[]): number | null {
  if (sortedValues.length === 0) {
    return null
  }

  const middle = Math.floor(sortedValues.length / 2)
  if (sortedValues.length % 2 === 1) {
    return sortedValues[middle]
  }
  return (sortedValues[middle - 1] + sortedValues[middle]) / 2
}

function toneForPercentile(percentile: number | null): SummaryTone {
  if (percentile === null) {
    return "neutral"
  }
  if (percentile >= STRONG_PERCENTILE) {
    return "positive"
  }
  if (percentile <= WEAK_PERCENTILE) {
    return "negative"
  }
  return "neutral"
}

function abilityWord(overall: number): string {
  if (overall >= 90) {
    return "Elite"
  }
  if (overall >= 80) {
    return "Top-tier"
  }
  if (overall >= 70) {
    return "Reliable"
  }
  if (overall >= 60) {
    return "Squad-level"
  }
  if (overall >= 50) {
    return "Fringe"
  }
  return "Struggling"
}

function trendSentence(rating: PlayerRatingSummary): string {
  const gap = rating.performanceGap

  switch (rating.trend) {
    case "overperforming":
      return gap === null
        ? "Running above his historic level."
        : `Running ${Math.abs(Math.round(gap))} points above his historic level.`
    case "underperforming":
      return gap === null
        ? "Running below his historic level."
        : `Running ${Math.abs(Math.round(gap))} points below his historic level.`
    case "performing_as_expected":
      return "Performing right at his historic level."
    case "early_season_variance":
      return "Small sample so far, so the rating will still move a lot."
    case "preseason":
      return "Rated on last season's evidence until the new season starts."
    case "no_baseline":
      return "No historic baseline to measure him against yet."
    default: {
      const _exhaustive: never = rating.trend
      return _exhaustive
    }
  }
}

function trendTone(rating: PlayerRatingSummary): SummaryTone {
  switch (rating.trend) {
    case "overperforming":
      return "positive"
    case "underperforming":
      return "negative"
    case "performing_as_expected":
    case "early_season_variance":
    case "preseason":
    case "no_baseline":
      return "neutral"
    default: {
      const _exhaustive: never = rating.trend
      return _exhaustive
    }
  }
}

function trendValue(rating: PlayerRatingSummary): string {
  if (rating.performanceGap === null || rating.expectedOverall === null) {
    return "—"
  }

  const gap = Math.round(rating.performanceGap)
  return gap > 0 ? `+${gap}` : `${gap}`
}

function buildAvailability(player: FplElement): SummaryAvailability | null {
  const note = player.news.trim()
  const chance = player.chance_of_playing_next_round

  if (player.status === "a" && note.length === 0) {
    return chance !== null && chance < 100
      ? {
          label: `${chance}% chance of playing`,
          note: null,
          tone: chance >= 75 ? "neutral" : "negative",
        }
      : null
  }

  const label =
    chance !== null && chance < 100
      ? `${formatPlayerStatus(player.status)} · ${chance}% chance`
      : formatPlayerStatus(player.status)

  return {
    label,
    note: note.length > 0 ? note : null,
    tone: player.status === "a" ? "neutral" : "negative",
  }
}

type CohortValues = {
  overall: number[]
  pointsPerMillion: number[]
  pointsPerGame: number[]
  minutes: number[]
}

/**
 * Sorted per-position stat distributions over players who have cleared the
 * cohort minutes floor. Built once per player list, then reused for every
 * percentile lookup in the summary.
 */
export function buildPositionCohort(
  players: readonly FplElement[],
  ratingsById: Map<number, PlayerRatingSummary>,
  elementType: FplElementTypeId
): CohortValues {
  const cohort: CohortValues = {
    overall: [],
    pointsPerMillion: [],
    pointsPerGame: [],
    minutes: [],
  }

  for (const player of players) {
    if (
      player.element_type !== elementType ||
      player.minutes < SUMMARY_COHORT_MIN_MINUTES
    ) {
      continue
    }

    const overall = ratingsById.get(player.id)?.overall
    if (overall !== undefined) {
      cohort.overall.push(overall)
    }

    const ppm = pointsPerMillion(player)
    if (ppm !== null) {
      cohort.pointsPerMillion.push(ppm)
    }

    const ppg = parseNumber(player.points_per_game)
    if (ppg !== null) {
      cohort.pointsPerGame.push(ppg)
    }

    cohort.minutes.push(player.minutes)
  }

  for (const values of Object.values(cohort)) {
    values.sort((left, right) => left - right)
  }

  return cohort
}

type LeafStat = {
  key: string
  rating: number
  percentile: number | null
  effectiveWeight: number
}

function collectLeafStats(
  categories: Partial<Record<CategoryId, BlendedCategoryScore>>
): LeafStat[] {
  const leaves: LeafStat[] = []

  for (const category of Object.values(categories)) {
    for (const sub of Object.values(category.sub)) {
      for (const [key, stat] of Object.entries(sub.stats)) {
        if (stat.rating === null) {
          continue
        }

        leaves.push({
          key,
          rating: stat.rating,
          percentile: stat.percentile,
          effectiveWeight: category.weight * sub.weight * stat.weight,
        })
      }
    }
  }

  return leaves
}

function toChip(stat: LeafStat, kind: SummaryChip["kind"]): SummaryChip {
  return {
    id: `${kind}-${stat.key}`,
    label: getStatLabel(stat.key),
    detail:
      stat.percentile === null
        ? `${stat.rating}`
        : formatPercentile(stat.percentile * 100),
    kind,
  }
}

export function buildSummaryChips(
  categories: Partial<Record<CategoryId, BlendedCategoryScore>> | undefined
): SummaryChip[] {
  if (!categories) {
    return []
  }

  const leaves = collectLeafStats(categories).filter(
    (leaf) =>
      leaf.effectiveWeight >= CHIP_MIN_EFFECTIVE_WEIGHT && leaf.percentile !== null
  )
  if (leaves.length === 0) {
    return []
  }

  const byRatingDesc = [...leaves].sort((left, right) => right.rating - left.rating)

  const strengths = byRatingDesc
    .filter(
      (leaf) =>
        leaf.rating >= STRENGTH_RATING_FLOOR &&
        (leaf.percentile ?? 0) >= STRENGTH_PERCENTILE_FLOOR
    )
    .slice(0, MAX_CHIPS_PER_SIDE)
    .map((leaf) => toChip(leaf, "strength"))

  const concerns = [...byRatingDesc]
    .reverse()
    .filter(
      (leaf) =>
        leaf.rating <= WEAKNESS_RATING_CEILING &&
        (leaf.percentile ?? 1) <= WEAKNESS_PERCENTILE_CEILING
    )
    .slice(0, MAX_CHIPS_PER_SIDE)
    .map((leaf) => toChip(leaf, "concern"))

  return [...strengths, ...concerns]
}

function buildHeadline({
  player,
  rating,
  clubShortName,
  abilityPercentile,
  valuePercentile,
}: {
  player: FplElement
  rating: PlayerRatingSummary | undefined
  clubShortName: string
  abilityPercentile: number | null
  valuePercentile: number | null
}): string {
  const noun = POSITION_NOUN[player.element_type]
  const plural = POSITION_PLURAL[player.element_type]
  const price = formatPlayerPrice(player.now_cost)

  if (!rating) {
    return `${player.web_name} is a ${noun} at ${clubShortName}, priced at ${price}. No rating yet.`
  }

  if (rating.unassessed || player.minutes < SUMMARY_COHORT_MIN_MINUTES) {
    return `${player.web_name} has played too little to assess — ${player.minutes} minutes at ${clubShortName}, priced at ${price}.`
  }

  const sentences: string[] = []

  sentences.push(
    abilityPercentile === null
      ? `${abilityWord(rating.overall)} ${noun} at ${clubShortName}.`
      : `${abilityWord(rating.overall)} ${noun} at ${clubShortName} — ${formatPercentile(abilityPercentile)} percentile among ${plural}.`
  )

  sentences.push(trendSentence(rating))

  if (valuePercentile === null) {
    sentences.push(`Priced at ${price}.`)
  } else if (valuePercentile >= STRONG_PERCENTILE) {
    sentences.push(`Strong value at ${price}.`)
  } else if (valuePercentile <= WEAK_PERCENTILE) {
    sentences.push(`Expensive at ${price} for the return.`)
  } else {
    sentences.push(`Fairly priced at ${price}.`)
  }

  return sentences.join(" ")
}

export type BuildScoutSummaryInput = {
  player: FplElement
  clubShortName: string
  rating: PlayerRatingSummary | undefined
  ratingsById: Map<number, PlayerRatingSummary>
  players: readonly FplElement[]
  detailCategories:
    | Partial<Record<CategoryId, BlendedCategoryScore>>
    | undefined
  fixtures: FixtureRun | null
  history: readonly PlayerSeasonHistoryEntry[]
}

export function buildScoutSummary({
  player,
  clubShortName,
  rating,
  ratingsById,
  players,
  detailCategories,
  fixtures,
  history,
}: BuildScoutSummaryInput): ScoutSummary {
  const cohort = buildPositionCohort(players, ratingsById, player.element_type)
  const plural = POSITION_PLURAL[player.element_type]

  const abilityPercentile =
    rating === undefined
      ? null
      : percentileOf(cohort.overall, rating.overall)

  const ppm = pointsPerMillion(player)
  const valuePercentile =
    ppm === null ? null : percentileOf(cohort.pointsPerMillion, ppm)
  const valueMedian = medianOf(cohort.pointsPerMillion)

  const ppg = parseNumber(player.points_per_game)
  const returnsPercentile =
    ppg === null ? null : percentileOf(cohort.pointsPerGame, ppg)
  const returnsMedian = medianOf(cohort.pointsPerGame)

  const minutesPercentile = percentileOf(cohort.minutes, player.minutes)

  const abilityRange = buildMetricRange(
    cohort.overall,
    rating?.overall ?? null,
    {
      unit: "",
      decimals: 0,
      boundaries: ABILITY_BAND_BOUNDARIES,
      scaleMin: ABILITY_SCALE_MIN,
      scaleMax: ABILITY_SCALE_MAX,
    }
  )
  const valueRange = buildMetricRange(cohort.pointsPerMillion, ppm, {
    unit: "pts/£m",
    decimals: 1,
  })
  const returnsRange = buildMetricRange(cohort.pointsPerGame, ppg, {
    unit: "per game",
    decimals: 1,
  })
  const minutesRange = buildMetricRange(cohort.minutes, player.minutes, {
    unit: "mins",
    decimals: 0,
  })

  const metrics: SummaryMetric[] = [
    {
      id: "ability",
      label: "Ability",
      value: rating ? `${rating.overall}` : "—",
      valueNote: null,
      detail: abilityRange
        ? null
        : abilityPercentile === null
          ? "No cohort to compare against"
          : `${formatPercentile(abilityPercentile)} percentile among ${plural}`,
      tone: abilityRange
        ? BAND_TONE[abilityRange.bandId]
        : toneForPercentile(abilityPercentile),
      percentile: abilityPercentile,
      range: abilityRange,
    },
    {
      id: "value",
      label: "Value",
      value: ppm === null ? "—" : `${ppm.toFixed(1)} pts/£m`,
      valueNote: formatPlayerPrice(player.now_cost),
      detail: valueRange
        ? null
        : valueMedian === null
          ? "No cohort to compare against"
          : `Median for ${plural} is ${valueMedian.toFixed(1)}`,
      tone: valueRange
        ? BAND_TONE[valueRange.bandId]
        : toneForPercentile(valuePercentile),
      percentile: valuePercentile,
      range: valueRange,
    },
    {
      id: "returns",
      label: "Returns",
      value: ppg === null ? "—" : `${ppg.toFixed(1)} per game`,
      valueNote: `${player.total_points} pts`,
      detail: returnsRange
        ? null
        : returnsMedian === null
          ? `${player.total_points} points this season`
          : `${player.total_points} points · ${returnsMedian.toFixed(1)} median`,
      tone: returnsRange
        ? BAND_TONE[returnsRange.bandId]
        : toneForPercentile(returnsPercentile),
      percentile: returnsPercentile,
      range: returnsRange,
    },
    {
      id: "minutes",
      label: "Minutes",
      value: `${player.minutes.toLocaleString()}`,
      valueNote: `${player.starts} starts`,
      detail: minutesRange
        ? null
        : minutesPercentile === null
          ? null
          : `${formatPercentile(minutesPercentile)} percentile among ${plural}`,
      tone: minutesRange
        ? BAND_TONE[minutesRange.bandId]
        : toneForPercentile(minutesPercentile),
      percentile: minutesPercentile,
      range: minutesRange,
    },
  ]

  // Pre-season and baseline-less players have no gap to show; the row would be
  // a permanent em dash, so the headline carries that context instead.
  if (rating && rating.performanceGap !== null && rating.expectedOverall !== null) {
    metrics.splice(1, 0, {
      id: "trajectory",
      label: "vs baseline",
      value: trendValue(rating),
      valueNote: `${rating.expectedOverall} expected`,
      detail: null,
      tone: trendTone(rating),
      percentile: null,
      range: null,
    })
  }

  return {
    headline: buildHeadline({
      player,
      rating,
      clubShortName,
      abilityPercentile,
      valuePercentile,
    }),
    cohortCaption: `vs ${cohort.minutes.length} ${plural}`,
    availability: buildAvailability(player),
    metrics,
    chips: buildSummaryChips(detailCategories),
    fixtures,
    history: [...history],
  }
}
