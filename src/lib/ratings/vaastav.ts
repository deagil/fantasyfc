import type {
  FplHistoryPastSeason,
  RatingElementType,
  SeasonHistoryInput,
} from "@/lib/ratings/model"

/**
 * Historical season data from the vaastav/Fantasy-Premier-League GitHub repo.
 * Each season directory holds `players_raw.csv` — the full bootstrap-static
 * element dump for that season (whole league, not just players still in the
 * game today). One fetch per season replaces ~800 element-summary API calls.
 */

export const VAASTAV_BASE_URL =
  "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data"

export type VaastavSeason = {
  /** Directory name in the repo, e.g. "2025-26". */
  dir: string
  /** Season label matching FPL's history_past format, e.g. "2025/26". */
  name: string
}

/**
 * The `count` seasons before the current one (startYear = first year of the
 * current season, e.g. 2026 for 2026/27 → 2025-26, 2024-25, 2023-24).
 */
export function previousSeasons(startYear: number, count = 3): VaastavSeason[] {
  return Array.from({ length: count }, (_, index) => {
    const year = startYear - 1 - index
    const suffix = String((year + 1) % 100).padStart(2, "0")
    return { dir: `${year}-${suffix}`, name: `${year}/${suffix}` }
  })
}

export function playersRawUrl(season: VaastavSeason): string {
  return `${VAASTAV_BASE_URL}/${season.dir}/players_raw.csv`
}

/** Minimal RFC4180 CSV parser (quoted fields may contain commas/newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") {
        i++
      }
      row.push(field)
      field = ""
      if (row.length > 1 || row[0] !== "") {
        rows.push(row)
      }
      row = []
    } else {
      field += char
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field)
    if (row.length > 1 || row[0] !== "") {
      rows.push(row)
    }
  }

  return rows
}

export function csvToRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text)
  if (rows.length < 2) {
    return []
  }
  const headers = rows[0]
  return rows.slice(1).map((values) => {
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = values[index] ?? ""
    })
    return record
  })
}

function num(record: Record<string, string>, key: string): number {
  const value = record[key] as string | undefined
  if (value === undefined || value === "" || value === "None") {
    return 0
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function str(record: Record<string, string>, key: string): string {
  const value = record[key] as string | undefined
  return value === undefined || value === "None" ? "0" : value
}

/**
 * Map players_raw.csv records to the same shape as FPL's `history_past`
 * rows, so downstream derivation (stats.ts / history.ts) is shared with the
 * API path. Columns a season didn't track (e.g. defensive_contribution
 * pre-2025) come out as 0 across the whole cohort and are dropped by the
 * engine's zero-variance guard.
 *
 * Excludes non-player element types (FPL added element_type 5 assistant
 * managers in 2024/25).
 */
export function mapPlayersRaw(
  records: readonly Record<string, string>[],
  seasonName: string
): SeasonHistoryInput[] {
  const inputs: SeasonHistoryInput[] = []

  for (const record of records) {
    const elementType = num(record, "element_type")
    const code = num(record, "code")
    if (code <= 0 || elementType < 1 || elementType > 4) {
      continue
    }

    const nowCost = num(record, "now_cost")
    const stats: FplHistoryPastSeason = {
      season_name: seasonName,
      element_code: code,
      start_cost: nowCost - num(record, "cost_change_start"),
      end_cost: nowCost,
      total_points: num(record, "total_points"),
      minutes: num(record, "minutes"),
      goals_scored: num(record, "goals_scored"),
      assists: num(record, "assists"),
      clean_sheets: num(record, "clean_sheets"),
      goals_conceded: num(record, "goals_conceded"),
      own_goals: num(record, "own_goals"),
      penalties_saved: num(record, "penalties_saved"),
      penalties_missed: num(record, "penalties_missed"),
      yellow_cards: num(record, "yellow_cards"),
      red_cards: num(record, "red_cards"),
      saves: num(record, "saves"),
      bonus: num(record, "bonus"),
      bps: num(record, "bps"),
      influence: str(record, "influence"),
      creativity: str(record, "creativity"),
      threat: str(record, "threat"),
      ict_index: str(record, "ict_index"),
      clearances_blocks_interceptions: num(
        record,
        "clearances_blocks_interceptions"
      ),
      recoveries: num(record, "recoveries"),
      tackles: num(record, "tackles"),
      defensive_contribution: num(record, "defensive_contribution"),
      starts: num(record, "starts"),
      expected_goals: str(record, "expected_goals"),
      expected_assists: str(record, "expected_assists"),
      expected_goal_involvements: str(record, "expected_goal_involvements"),
      expected_goals_conceded: str(record, "expected_goals_conceded"),
    }

    inputs.push({
      playerCode: code,
      webName: record.web_name || `#${code}`,
      elementType: elementType as RatingElementType,
      seasonName,
      stats,
    })
  }

  return inputs
}
