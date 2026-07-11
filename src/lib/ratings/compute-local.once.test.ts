/**
 * One-shot local ratings compute. Run with:
 *   RUN_RATINGS_COMPUTE=1 pnpm exec vitest run src/lib/ratings/compute-local.once.test.ts
 *
 * Skipped unless RUN_RATINGS_COMPUTE=1 so it does not run in normal `pnpm test`.
 */
import fs from "node:fs"
import path from "node:path"

import { createClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import { blendRatings } from "@/lib/ratings/blend"
import { calibrateRatings } from "@/lib/ratings/calibrate"
import { computeRatings } from "@/lib/ratings/engine"
import { RATINGS_ALGO_VERSION } from "@/lib/ratings/hierarchy"
import { computeExpectedBaselines } from "@/lib/ratings/history"
import type { FplEvent } from "@/lib/fpl/types"
import type {
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

const FPL_API = "https://fantasy.premierleague.com/api"
const OUT_DIR = path.resolve("artifacts/ratings")
const HISTORY_SEASONS = 3
const UPSERT_CHUNK = 500

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq)
    let value = trimmed.slice(eq + 1)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function deriveSeasonLabel(events: readonly FplEvent[]): string {
  const first = events.at(0)
  const startYear = first
    ? new Date(first.deadline_time).getFullYear()
    : new Date().getFullYear()
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`
}

function deriveCurrentEvent(events: readonly FplEvent[]): number {
  const current = events.find((event) => event.is_current)
  if (current) return current.id
  return events.filter((event) => event.finished).length
}

const POS: Record<number, string> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" }

describe("local ratings compute", () => {
  it.skipIf(process.env.RUN_RATINGS_COMPUTE !== "1")(
    "computes and writes a snapshot",
    async () => {
      loadEnvFile(path.resolve(".env.local"))
      loadEnvFile(path.resolve(".env"))

      const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      expect(url, "SUPABASE_URL required").toBeTruthy()
      expect(serviceKey, "SUPABASE_SERVICE_ROLE_KEY required").toBeTruthy()

      const supabase = createClient(url!, serviceKey!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      console.log("Fetching bootstrap-static…")
      const bootstrapRes = await fetch(`${FPL_API}/bootstrap-static/`)
      expect(bootstrapRes.ok).toBe(true)
      const bootstrap = (await bootstrapRes.json()) as {
        events: FplEvent[]
        elements: RatingsBootstrapElement[]
      }

      const season = deriveSeasonLabel(bootstrap.events)
      const event = deriveCurrentEvent(bootstrap.events)
      console.log(`Season ${season}, event ${event}, players ${bootstrap.elements.length}`)

      // Load or seed history
      let historyRows: SeasonHistoryInput[] = []
      {
        const { data, error } = await supabase
          .from("player_season_history")
          .select("player_code, season_name, element_type, web_name, stats")
        if (error) {
          throw new Error(
            `player_season_history read failed (migration applied?): ${error.message}`
          )
        }
        type HistoryDbRow = {
          player_code: number
          season_name: string
          element_type: number
          web_name: string
          stats: SeasonHistoryInput["stats"]
        }
        historyRows = (data as HistoryDbRow[]).map((row) => ({
          playerCode: row.player_code,
          seasonName: row.season_name,
          elementType: row.element_type as 1 | 2 | 3 | 4,
          webName: row.web_name,
          stats: row.stats,
        }))
      }

      if (historyRows.length === 0) {
        console.log("No history rows — seeding from vaastav…")
        const startYear = Number(season.slice(0, 4))
        for (const past of previousSeasons(startYear, HISTORY_SEASONS)) {
          const csvUrl = playersRawUrl(past)
          const res = await fetch(csvUrl)
          if (!res.ok) {
            console.log(`  skip ${past.name} (${res.status})`)
            continue
          }
          const inputs = mapPlayersRaw(csvToRecords(await res.text()), past.name)
          const rows = inputs.map((input) => ({
            player_code: input.playerCode,
            season_name: input.seasonName,
            element_type: input.elementType,
            web_name: input.webName,
            stats: input.stats,
          }))
          for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
            const { error } = await supabase
              .from("player_season_history")
              .upsert(rows.slice(i, i + UPSERT_CHUNK), {
                onConflict: "player_code,season_name",
              })
            if (error) throw new Error(`seed ${past.name}: ${error.message}`)
          }
          console.log(`  seeded ${past.name}: ${rows.length} players`)
          historyRows.push(...inputs)
        }
      } else {
        const seasons = [...new Set(historyRows.map((r) => r.seasonName))].sort()
        console.log(
          `History loaded: ${historyRows.length} rows across ${seasons.join(", ")}`
        )
      }

      const baselines = computeExpectedBaselines(historyRows)
      console.log(`Baselines for ${baselines.size} player codes`)

      const players = bootstrap.elements.map((el) => ({
        id: el.id,
        code: el.code,
        webName: el.web_name,
        elementType: el.element_type,
        minutes: Number(el.minutes) || 0,
        status: el.status,
        stats: deriveBootstrapStats(el),
      }))

      console.log("Computing ratings…")
      const current = computeRatings(players, { event })
      const results = calibrateRatings(blendRatings(current, baselines, event))

      const computedAt = new Date().toISOString()
      const dbRows = results.map((r) => ({
        season,
        event,
        player_id: r.id,
        player_code: r.code,
        web_name: r.webName,
        element_type: r.elementType,
        overall: r.overall,
        current_overall: r.currentOverall,
        expected_overall: r.expectedOverall,
        performance_gap: r.performanceGap,
        trend: r.trend,
        confidence: r.confidence,
        unassessed: r.unassessed,
        categories: r.categories,
        algo_version: RATINGS_ALGO_VERSION,
        computed_at: computedAt,
      }))

      console.log(`Persisting ${dbRows.length} rows to player_ratings…`)
      for (let i = 0; i < dbRows.length; i += UPSERT_CHUNK) {
        const { error } = await supabase
          .from("player_ratings")
          .upsert(dbRows.slice(i, i + UPSERT_CHUNK), {
            onConflict: "season,event,player_id",
          })
        if (error) throw new Error(`persist: ${error.message}`)
      }

      const sorted = [...results].sort((a, b) => b.overall - a.overall)
      const summaries = sorted.map((r) => ({
        id: r.id,
        code: r.code,
        webName: r.webName,
        pos: POS[r.elementType],
        overall: r.overall,
        current: r.currentOverall,
        expected: r.expectedOverall,
        gap: r.performanceGap,
        trend: r.trend,
        confidence: r.confidence,
        unassessed: r.unassessed,
        minutes: r.minutes,
        ATK: r.categories.ATK?.score ?? null,
        PLY: r.categories.PLY?.score ?? null,
        IMP: r.categories.IMP?.score ?? null,
        DEF: r.categories.DEF?.score ?? null,
        REL: r.categories.REL?.score ?? null,
        FPL: r.categories.FPL?.score ?? null,
        GKP: r.categories.GKP?.score ?? null,
      }))

      fs.mkdirSync(OUT_DIR, { recursive: true })
      const stamp = computedAt.replace(/[:.]/g, "-")
      const jsonPath = path.join(OUT_DIR, `ratings-${season.replace("/", "-")}-gw${event}-${stamp}.json`)
      const csvPath = path.join(OUT_DIR, `ratings-${season.replace("/", "-")}-gw${event}-${stamp}.csv`)
      const latestJson = path.join(OUT_DIR, "latest.json")
      const latestCsv = path.join(OUT_DIR, "latest.csv")

      const payload = {
        season,
        event,
        computedAt,
        playerCount: summaries.length,
        baselineCount: baselines.size,
        historySeasons: [...new Set(historyRows.map((r) => r.seasonName))].sort(),
        ratings: summaries,
      }
      fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2))
      fs.writeFileSync(latestJson, JSON.stringify(payload, null, 2))

      const csvHeader =
        "id,webName,pos,overall,current,expected,gap,trend,confidence,unassessed,minutes,ATK,PLY,IMP,DEF,REL,FPL,GKP"
      const csvBody = summaries
        .map((r) =>
          [
            r.id,
            JSON.stringify(r.webName),
            r.pos,
            r.overall,
            r.current,
            r.expected ?? "",
            r.gap ?? "",
            r.trend,
            r.confidence,
            r.unassessed,
            r.minutes,
            r.ATK ?? "",
            r.PLY ?? "",
            r.IMP ?? "",
            r.DEF ?? "",
            r.REL ?? "",
            r.FPL ?? "",
            r.GKP ?? "",
          ].join(",")
        )
        .join("\n")
      fs.writeFileSync(csvPath, `${csvHeader}\n${csvBody}\n`)
      fs.writeFileSync(latestCsv, `${csvHeader}\n${csvBody}\n`)

      console.log("\n=== Top 25 overall ===")
      console.log(
        "OVR  CUR  EXP  POS  Name".padEnd(40) + "  ATK PLY IMP DEF REL FPL GKP"
      )
      for (const r of summaries.slice(0, 25)) {
        const cats = [r.ATK, r.PLY, r.IMP, r.DEF, r.REL, r.FPL, r.GKP]
          .map((v) => (v == null ? "  -" : String(v).padStart(3)))
          .join(" ")
        console.log(
          `${String(r.overall).padStart(3)}  ${String(r.current).padStart(3)}  ${String(r.expected ?? "-").padStart(3)}  ${r.pos}  ${r.webName.padEnd(18)}  ${cats}`
        )
      }

      for (const pos of ["GKP", "DEF", "MID", "FWD"] as const) {
        const top = summaries.filter((r) => r.pos === pos).slice(0, 8)
        console.log(`\n=== Top ${pos} ===`)
        for (const r of top) {
          console.log(
            `  ${r.overall}  ${r.webName}  (cur ${r.current}, exp ${r.expected ?? "—"}, ${r.trend})`
          )
        }
      }

      console.log(`\nWrote:\n  ${jsonPath}\n  ${csvPath}\n  ${latestJson}\n  ${latestCsv}`)
      expect(summaries.length).toBeGreaterThan(100)
    },
    180_000
  )
})
