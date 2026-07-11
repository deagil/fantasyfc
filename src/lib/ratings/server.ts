import { createServerFn } from "@tanstack/react-start"

import { requireServerAuthUser } from "@/lib/auth/auth.server"
import { cached } from "@/lib/fpl/cache"
import type { FplEvent } from "@/lib/fpl/types"
import { blendRatings } from "@/lib/ratings/blend"
import { calibrateRatings } from "@/lib/ratings/calibrate"
import { computeRatings } from "@/lib/ratings/engine"
import { RATINGS_ALGO_VERSION } from "@/lib/ratings/hierarchy"
import { computeExpectedBaselines } from "@/lib/ratings/history"
import type {
  EnginePlayer,
  FplHistoryPastSeason,
  PlayerRatingResult,
  PlayerRatingSummary,
  PlayerRatingsPayload,
  RatingElementType,
  RatingsBootstrapElement,
  SeasonHistoryInput,
} from "@/lib/ratings/model"
import { deriveBootstrapStats } from "@/lib/ratings/stats"
import {
  csvToRecords,
  mapPlayersRaw,
  playersRawUrl,
  previousSeasons,
} from "@/lib/ratings/vaastav"
import { createServiceRoleClient } from "@/lib/supabase/admin"

const FPL_API_BASE = "https://fantasy.premierleague.com/api"
const HOUR = 60 * 60 * 1000

const RATINGS_TTL = 3 * HOUR
const UPSERT_CHUNK_SIZE = 500
/** Number of past seasons to seed for expected baselines. */
const HISTORY_SEASONS = 3

type FullBootstrap = {
  events: FplEvent[]
  elements: RatingsBootstrapElement[]
}

/**
 * The app-wide bootstrap fetch (fpl/server.ts) trims elements down to the few
 * fields the hub needs. Ratings need the full stat block, so it is fetched
 * and cached separately here.
 */
async function fetchFullBootstrap(): Promise<FullBootstrap> {
  return cached("bootstrap:full", RATINGS_TTL, async () => {
    const response = await fetch(`${FPL_API_BASE}/bootstrap-static/`)
    if (!response.ok) {
      throw new Error("Failed to fetch FPL bootstrap data")
    }
    const data = (await response.json()) as FullBootstrap
    return { events: data.events, elements: data.elements }
  })
}

/** e.g. "2026/27", derived from the first deadline of the season. */
export function deriveSeasonLabel(events: readonly FplEvent[]): string {
  const first = events.at(0)
  const startYear = first
    ? new Date(first.deadline_time).getFullYear()
    : new Date().getFullYear()
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`
}

/**
 * Snapshot gameweek: the current event if one exists, otherwise the number
 * of finished events (0 → pre-season, ratings become fully historical).
 */
export function deriveCurrentEvent(events: readonly FplEvent[]): number {
  const current = events.find((event) => event.is_current)
  if (current) {
    return current.id
  }
  return events.filter((event) => event.finished).length
}

function toEnginePlayer(el: RatingsBootstrapElement): EnginePlayer {
  return {
    id: el.id,
    code: el.code,
    webName: el.web_name,
    elementType: el.element_type,
    minutes: Number(el.minutes) || 0,
    status: el.status,
    stats: deriveBootstrapStats(el),
  }
}

function toSummary(result: PlayerRatingResult): PlayerRatingSummary {
  const categories: PlayerRatingSummary["categories"] = {}
  for (const [categoryId, category] of Object.entries(result.categories)) {
    categories[categoryId as keyof typeof categories] = category.score
  }

  return {
    id: result.id,
    code: result.code,
    webName: result.webName,
    elementType: result.elementType,
    overall: result.overall,
    currentOverall: result.currentOverall,
    expectedOverall: result.expectedOverall,
    performanceGap: result.performanceGap,
    trend: result.trend,
    confidence: result.confidence,
    unassessed: result.unassessed,
    categories,
  }
}

type HistoryRow = {
  player_code: number
  season_name: string
  element_type: number
  web_name: string
  stats: FplHistoryPastSeason
}

async function loadSeasonHistory(): Promise<SeasonHistoryInput[]> {
  const supabase = createServiceRoleClient()
  const rows: HistoryRow[] = []
  const pageSize = 1000
  let from = 0

  // Supabase caps selects at 1000 rows; page through the full table.
  for (;;) {
    const { data, error } = await supabase
      .from("player_season_history")
      .select("player_code, season_name, element_type, web_name, stats")
      .order("player_code", { ascending: true })
      .order("season_name", { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      throw new Error(`Failed to load player season history: ${error.message}`)
    }
    const page = data as HistoryRow[]
    rows.push(...page)
    if (page.length < pageSize) {
      break
    }
    from += pageSize
  }

  return rows.map((row) => ({
    playerCode: row.player_code,
    webName: row.web_name,
    elementType: row.element_type as RatingElementType,
    seasonName: row.season_name,
    stats: row.stats,
  }))
}

type RatingRow = {
  season: string
  event: number
  player_id: number
  player_code: number
  web_name: string
  element_type: number
  overall: number
  current_overall: number
  expected_overall: number | null
  performance_gap: number | null
  trend: PlayerRatingSummary["trend"]
  confidence: PlayerRatingSummary["confidence"]
  unassessed: boolean
  categories: PlayerRatingResult["categories"]
  algo_version: number
  computed_at?: string
}

async function loadSnapshot(
  season: string,
  event: number
): Promise<PlayerRatingsPayload | null> {
  const supabase = createServiceRoleClient()
  const rows: RatingRow[] = []
  const pageSize = 1000
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from("player_ratings")
      .select(
        "season, event, player_id, player_code, web_name, element_type, overall, current_overall, expected_overall, performance_gap, trend, confidence, unassessed, categories, algo_version, computed_at"
      )
      .eq("season", season)
      .eq("event", event)
      .eq("algo_version", RATINGS_ALGO_VERSION)
      .order("player_id", { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      throw new Error(`Failed to load rating snapshot: ${error.message}`)
    }
    const page = data as RatingRow[]
    rows.push(...page)
    if (page.length < pageSize) {
      break
    }
    from += pageSize
  }

  if (rows.length === 0) {
    return null
  }

  return {
    season,
    event,
    computedAt: rows[0].computed_at ?? new Date().toISOString(),
    ratings: rows.map((row) => {
      const categories: PlayerRatingSummary["categories"] = {}
      for (const [categoryId, category] of Object.entries(row.categories)) {
        categories[categoryId as keyof typeof categories] = category.score
      }
      return {
        id: row.player_id,
        code: row.player_code,
        webName: row.web_name,
        elementType: row.element_type as RatingElementType,
        overall: row.overall,
        currentOverall: row.current_overall,
        expectedOverall: row.expected_overall,
        performanceGap: row.performance_gap,
        trend: row.trend,
        confidence: row.confidence,
        unassessed: row.unassessed,
        categories,
      }
    }),
  }
}

async function persistSnapshot(
  season: string,
  event: number,
  results: readonly PlayerRatingResult[]
): Promise<void> {
  const supabase = createServiceRoleClient()
  const computedAt = new Date().toISOString()

  const rows: RatingRow[] = results.map((result) => ({
    season,
    event,
    player_id: result.id,
    player_code: result.code,
    web_name: result.webName,
    element_type: result.elementType,
    overall: result.overall,
    current_overall: result.currentOverall,
    expected_overall: result.expectedOverall,
    performance_gap: result.performanceGap,
    trend: result.trend,
    confidence: result.confidence,
    unassessed: result.unassessed,
    categories: result.categories,
    algo_version: RATINGS_ALGO_VERSION,
    computed_at: computedAt,
  }))

  for (let index = 0; index < rows.length; index += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + UPSERT_CHUNK_SIZE)
    const { error } = await supabase
      .from("player_ratings")
      .upsert(chunk, { onConflict: "season,event,player_id" })

    if (error) {
      throw new Error(`Failed to persist rating snapshot: ${error.message}`)
    }
  }
}

async function computeAndPersistRatings(): Promise<PlayerRatingsPayload> {
  const bootstrap = await fetchFullBootstrap()
  const season = deriveSeasonLabel(bootstrap.events)
  const event = deriveCurrentEvent(bootstrap.events)

  const existing = await loadSnapshot(season, event)
  if (existing) {
    return existing
  }

  const historyRows = await loadSeasonHistory()
  const baselines = computeExpectedBaselines(historyRows)

  const players = bootstrap.elements.map(toEnginePlayer)
  const currentRatings = computeRatings(players, { event })
  const results = calibrateRatings(blendRatings(currentRatings, baselines, event))

  await persistSnapshot(season, event, results)

  return {
    season,
    event,
    computedAt: new Date().toISOString(),
    ratings: results.map(toSummary),
  }
}

/**
 * Compact ratings for every player at the latest gameweek snapshot.
 * Computed at most once per gameweek and served from Supabase after that;
 * the in-memory cache keeps repeat calls off the database.
 */
export const getPlayerRatings = createServerFn({ method: "GET" }).handler(() =>
  cached(`ratings:payload:v${RATINGS_ALGO_VERSION}`, RATINGS_TTL, computeAndPersistRatings)
)

/**
 * Full category/sub-category/stat breakdown for one player from the latest
 * snapshot — the data behind a FIFA-style player detail card.
 */
export const getPlayerRatingDetail = createServerFn({ method: "POST" })
  .validator((data: { playerId: number }) => {
    const playerId = Number(data.playerId)
    if (!Number.isInteger(playerId) || playerId <= 0) {
      throw new Error("Invalid playerId")
    }
    return { playerId }
  })
  .handler(async ({ data }) => {
    // Ensure the snapshot exists before reading from it.
    const payload = await cached(
      `ratings:payload:v${RATINGS_ALGO_VERSION}`,
      RATINGS_TTL,
      computeAndPersistRatings
    )

    const supabase = createServiceRoleClient()
    const { data: row, error } = await supabase
      .from("player_ratings")
      .select("*")
      .eq("season", payload.season)
      .eq("event", payload.event)
      .eq("player_id", data.playerId)
      .eq("algo_version", RATINGS_ALGO_VERSION)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to load rating detail: ${error.message}`)
    }
    if (!row) {
      throw new Error("No rating found for player")
    }

    const typed = row as RatingRow
    return {
      season: typed.season,
      event: typed.event,
      id: typed.player_id,
      code: typed.player_code,
      webName: typed.web_name,
      elementType: typed.element_type as RatingElementType,
      overall: typed.overall,
      currentOverall: typed.current_overall,
      expectedOverall: typed.expected_overall,
      performanceGap: typed.performance_gap,
      trend: typed.trend,
      confidence: typed.confidence,
      unassessed: typed.unassessed,
      categories: typed.categories,
    }
  })

export type SeedRatingsHistoryResult = {
  seasons: { season: string; players: number; source: string }[]
  skipped: string[]
}

/**
 * Seed `player_season_history` from the vaastav/Fantasy-Premier-League repo:
 * one `players_raw.csv` fetch per season (last 3 seasons before the current
 * one), each containing the full league for that year. Idempotent — re-run
 * any time; re-run at the start of each season to pick up the newly finished
 * one. Seasons missing from the repo (e.g. not yet published) are skipped
 * and reported in `skipped`.
 */
export const seedRatingsHistory = createServerFn({ method: "POST" }).handler(
  async (): Promise<SeedRatingsHistoryResult> => {
    await requireServerAuthUser()

    const supabase = createServiceRoleClient()
    const bootstrap = await fetchFullBootstrap()
    const currentSeason = deriveSeasonLabel(bootstrap.events)
    const startYear = Number(currentSeason.slice(0, 4))

    const result: SeedRatingsHistoryResult = { seasons: [], skipped: [] }

    for (const season of previousSeasons(startYear, HISTORY_SEASONS)) {
      const url = playersRawUrl(season)
      const response = await fetch(url)

      if (!response.ok) {
        result.skipped.push(season.name)
        continue
      }

      const inputs = mapPlayersRaw(csvToRecords(await response.text()), season.name)

      const rows = inputs.map((input) => ({
        player_code: input.playerCode,
        season_name: input.seasonName,
        element_type: input.elementType,
        web_name: input.webName,
        stats: input.stats,
      }))

      for (let index = 0; index < rows.length; index += UPSERT_CHUNK_SIZE) {
        const chunk = rows.slice(index, index + UPSERT_CHUNK_SIZE)
        const { error } = await supabase
          .from("player_season_history")
          .upsert(chunk, { onConflict: "player_code,season_name" })

        if (error) {
          throw new Error(
            `Failed to store history for ${season.name}: ${error.message}`
          )
        }
      }

      result.seasons.push({
        season: season.name,
        players: rows.length,
        source: url,
      })
    }

    return result
  }
)
