/**
 * One-shot TheSportsDB enrichment seed. Run with:
 *   RUN_ENRICHMENT=1 pnpm exec vitest run src/lib/enrichment/run-enrichment.once.test.ts
 *
 * Skipped unless RUN_ENRICHMENT=1 so it does not run in normal `pnpm test`.
 *
 * Mirrors discoverEnrichment + seedEnrichment from server.ts (auth gated there;
 * this script uses the service role key from .env for local admin runs).
 */
import fs from "node:fs"
import path from "node:path"

import { createClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import { matchPlayers, matchTeams } from "@/lib/enrichment/matching"
import type {
  EnrichmentFplElement,
  EnrichmentFplTeam,
  PlayerEnrichmentBio,
  SeedEnrichmentResult,
  SportsDbPlayer,
  SportsDbTeam,
} from "@/lib/enrichment/model"
import {
  extractEntityLinks,
  SPORTSDB_LEAGUE_PAGE,
  teamPageUrl,
} from "@/lib/enrichment/pages"

const FPL_API_BASE = "https://fantasy.premierleague.com/api"
const SPORTSDB_API_BASE = "https://www.thesportsdb.com/api/v1/json"
const REQUEST_GAP_MS = 2100
const SEED_BATCH = 25
const USER_AGENT = "deadline-fpl-companion/1.0"
const RATE_LIMIT_WAIT_MS = 65_000
const MAX_RATE_LIMIT_RETRIES = 5

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvFile(path.resolve(".env.local"))
loadEnvFile(path.resolve(".env"))

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function log(message: string) {
  process.stderr.write(`${message}\n`)
}

function sportsDbKey(): string {
  return process.env.SPORTSDB_API_KEY ?? "123"
}

function createAdminClient() {
  const url =
    process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ""
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Need SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY"
    )
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function fetchSportsDbApi<T>(apiPath: string): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    const response = await fetch(
      `${SPORTSDB_API_BASE}/${sportsDbKey()}/${apiPath}`,
      { headers: { "User-Agent": USER_AGENT } }
    )
    if (response.status === 429) {
      if (attempt === MAX_RATE_LIMIT_RETRIES) {
        throw new Error(
          "TheSportsDB rate limit hit — wait a minute and re-run this step."
        )
      }
      log(
        `rate limited on ${apiPath}; waiting ${RATE_LIMIT_WAIT_MS / 1000}s (retry ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES})…`
      )
      await sleep(RATE_LIMIT_WAIT_MS)
      continue
    }
    if (!response.ok) {
      throw new Error(
        `TheSportsDB request failed (${response.status}): ${apiPath}`
      )
    }
    return (await response.json()) as T
  }
  throw new Error(`TheSportsDB request failed after retries: ${apiPath}`)
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
  if (!response.ok) {
    throw new Error(`Page fetch failed (${response.status}): ${url}`)
  }
  return response.text()
}

function toBio(player: SportsDbPlayer): PlayerEnrichmentBio {
  return {
    fullName: player.strPlayerAlternate || player.strPlayer,
    nationality: player.strNationality,
    birthDate: player.dateBorn,
    birthLocation: player.strBirthLocation,
    height: player.strHeight,
    weight: player.strWeight,
    side: player.strSide,
    number: player.strNumber,
    signing: player.strSigning,
    wage: player.strWage,
    description: player.strDescriptionEN,
    socials: {
      twitter: player.strTwitter,
      instagram: player.strInstagram,
      facebook: player.strFacebook,
      youtube: player.strYoutube,
    },
    poster: player.strPoster,
    banner: player.strBanner,
    fanart: [
      player.strFanart1,
      player.strFanart2,
      player.strFanart3,
      player.strFanart4,
    ].filter((url): url is string => url !== null && url !== ""),
  }
}

async function fetchBootstrap(): Promise<{
  teams: EnrichmentFplTeam[]
  elements: EnrichmentFplElement[]
}> {
  const response = await fetch(`${FPL_API_BASE}/bootstrap-static/`)
  if (!response.ok) throw new Error("Failed to fetch FPL bootstrap")
  const data = (await response.json()) as {
    teams: EnrichmentFplTeam[]
    elements: EnrichmentFplElement[]
  }
  return { teams: data.teams, elements: data.elements }
}

async function discover(supabase: ReturnType<typeof createAdminClient>) {
  const bootstrap = await fetchBootstrap()
  const leagueHtml = await fetchPage(SPORTSDB_LEAGUE_PAGE)
  const teamLinks = extractEntityLinks(leagueHtml, "team")

  const sdbTeams: SportsDbTeam[] = []
  let candidateRows: {
    sportsdb_id: number
    sportsdb_team_id: number
    slug: string | null
  }[] = []

  for (const link of teamLinks) {
    await sleep(REQUEST_GAP_MS)
    const lookup = await fetchSportsDbApi<{ teams: SportsDbTeam[] | null }>(
      `lookupteam.php?id=${link.id}`
    )
    const team = (lookup.teams ?? [])[0] as SportsDbTeam | undefined
    if (!team) continue
    sdbTeams.push(team)

    await sleep(REQUEST_GAP_MS)
    const teamHtml = await fetchPage(teamPageUrl(link.id, link.slug))
    const playerLinks = extractEntityLinks(teamHtml, "player")
    candidateRows = candidateRows.concat(
      playerLinks.map((player) => ({
        sportsdb_id: player.id,
        sportsdb_team_id: link.id,
        slug: player.slug,
      }))
    )
  }

  const { matches: teamMatches, unmatchedFpl } = matchTeams(
    bootstrap.teams,
    sdbTeams
  )
  const matchedSdbIds = new Set(
    [...teamMatches.values()].map((team) => Number(team.idTeam))
  )

  const teamRows = [...teamMatches.entries()].map(([fplTeamId, sdb]) => {
    const fpl = bootstrap.teams.find((t) => t.id === fplTeamId)!
    return {
      team_code: fpl.code,
      sportsdb_id: Number(sdb.idTeam),
      name: fpl.name,
      badge_url: sdb.strBadge,
      logo_url: sdb.strLogo,
      equipment_url: sdb.strEquipment,
      banner_url: sdb.strBanner,
      colours: [sdb.strColour1, sdb.strColour2, sdb.strColour3].filter(
        (colour): colour is string => colour !== null && colour !== ""
      ),
      stadium: {
        name: sdb.strStadium,
        capacity: sdb.intStadiumCapacity
          ? Number(sdb.intStadiumCapacity)
          : null,
        location: sdb.strLocation,
      },
      synced_at: new Date().toISOString(),
    }
  })

  if (teamRows.length > 0) {
    const { error } = await supabase
      .from("team_enrichment")
      .upsert(teamRows, { onConflict: "team_code" })
    if (error) throw new Error(`Failed to store team enrichment: ${error.message}`)
  }

  const relevantCandidates = candidateRows.filter((row) =>
    matchedSdbIds.has(row.sportsdb_team_id)
  )

  for (let index = 0; index < relevantCandidates.length; index += 500) {
    const chunk = relevantCandidates.slice(index, index + 500)
    const { error } = await supabase
      .from("sportsdb_candidates")
      .upsert(chunk, { onConflict: "sportsdb_id", ignoreDuplicates: true })
    if (error) throw new Error(`Failed to queue candidates: ${error.message}`)
  }

  const { count: totalCount } = await supabase
    .from("sportsdb_candidates")
    .select("sportsdb_id", { count: "exact", head: true })
  const { count: pendingCount } = await supabase
    .from("sportsdb_candidates")
    .select("sportsdb_id", { count: "exact", head: true })
    .is("processed_at", null)

  return {
    teamsDiscovered: teamLinks.length,
    teamsMatched: teamMatches.size,
    teamsUnmatched: unmatchedFpl.map((team) => team.name),
    candidatesTotal: totalCount ?? 0,
    candidatesPending: pendingCount ?? 0,
  }
}

async function seedBatch(
  supabase: ReturnType<typeof createAdminClient>,
  batchSize: number
): Promise<SeedEnrichmentResult> {
  const bootstrap = await fetchBootstrap()

  const { data: teamRowsRaw, error: teamError } = await supabase
    .from("team_enrichment")
    .select("team_code, sportsdb_id, name")
    .limit(100)
  if (teamError) {
    throw new Error(`Failed to load team enrichment: ${teamError.message}`)
  }
  const teamRows = teamRowsRaw as {
    team_code: number
    sportsdb_id: number
    name: string
  }[]

  const rosterBySdbTeam = new Map<number, EnrichmentFplElement[]>()
  const teamNameBySdbTeam = new Map<number, string>()
  for (const row of teamRows) {
    const fplTeam = bootstrap.teams.find((t) => t.code === row.team_code)
    if (!fplTeam) continue
    rosterBySdbTeam.set(
      row.sportsdb_id,
      bootstrap.elements.filter(
        (el) =>
          el.team === fplTeam.id &&
          el.element_type >= 1 &&
          el.element_type <= 4
      )
    )
    teamNameBySdbTeam.set(row.sportsdb_id, row.name)
  }

  const { data: candidatesRaw, error: candidateError } = await supabase
    .from("sportsdb_candidates")
    .select("sportsdb_id, sportsdb_team_id")
    .is("processed_at", null)
    .order("sportsdb_team_id", { ascending: true })
    .limit(batchSize)
  if (candidateError) {
    throw new Error(`Failed to load candidates: ${candidateError.message}`)
  }
  const candidates = candidatesRaw as {
    sportsdb_id: number
    sportsdb_team_id: number
  }[]

  const result: SeedEnrichmentResult = {
    processed: 0,
    matched: 0,
    remaining: 0,
    byMethod: {},
    unmatched: [],
  }

  const playersByTeam = new Map<number, SportsDbPlayer[]>()
  for (const candidate of candidates) {
    await sleep(REQUEST_GAP_MS)
    const lookup = await fetchSportsDbApi<{
      players: SportsDbPlayer[] | null
    }>(`lookupplayer.php?id=${candidate.sportsdb_id}`)
    const player = (lookup.players ?? [])[0] as SportsDbPlayer | undefined
    if (player) {
      const list = playersByTeam.get(candidate.sportsdb_team_id) ?? []
      list.push(player)
      playersByTeam.set(candidate.sportsdb_team_id, list)
    }
  }

  const matchedBySdbId = new Map<number, number>()

  for (const [sdbTeamId, players] of playersByTeam) {
    const roster = rosterBySdbTeam.get(sdbTeamId) ?? []
    const teamName = teamNameBySdbTeam.get(sdbTeamId) ?? String(sdbTeamId)
    const { matches, unmatchedSdb } = matchPlayers(roster, players)

    for (const match of matches) {
      matchedBySdbId.set(match.sportsdbId, match.playerCode)
      result.byMethod[match.method] = (result.byMethod[match.method] ?? 0) + 1
    }
    for (const player of unmatchedSdb) {
      result.unmatched.push({ team: teamName, name: player.strPlayer })
    }

    if (matches.length > 0) {
      const rows = matches.map((match) => ({
        player_code: match.playerCode,
        sportsdb_id: match.sportsdbId,
        web_name: match.webName,
        cutout_url: match.player.strCutout,
        render_url: match.player.strRender,
        thumb_url: match.player.strThumb,
        position: match.player.strPosition,
        creative_commons: match.player.strCreativeCommons === "Yes",
        bio: toBio(match.player),
        match_method: match.method,
        synced_at: new Date().toISOString(),
      }))
      const { error } = await supabase
        .from("player_enrichment")
        .upsert(rows, { onConflict: "player_code" })
      if (error) {
        throw new Error(`Failed to store player enrichment: ${error.message}`)
      }
    }
  }

  const processedAt = new Date().toISOString()
  for (const candidate of candidates) {
    const { error } = await supabase
      .from("sportsdb_candidates")
      .update({
        processed_at: processedAt,
        matched_player_code: matchedBySdbId.get(candidate.sportsdb_id) ?? null,
      })
      .eq("sportsdb_id", candidate.sportsdb_id)
    if (error) {
      throw new Error(`Failed to mark candidate processed: ${error.message}`)
    }
  }

  const { count: pendingCount } = await supabase
    .from("sportsdb_candidates")
    .select("sportsdb_id", { count: "exact", head: true })
    .is("processed_at", null)

  result.processed = candidates.length
  result.matched = matchedBySdbId.size
  result.remaining = pendingCount ?? 0
  return result
}

const shouldRun = process.env.RUN_ENRICHMENT === "1"

describe.skipIf(!shouldRun)("run enrichment seed", () => {
  it(
    "discovers candidates then seeds until remaining is 0",
    async () => {
      const supabase = createAdminClient()
      const seedOnly = process.env.ENRICHMENT_SEED_ONLY === "1"

      if (!seedOnly) {
        log("Phase 1: discoverEnrichment…")
        const discovery = await discover(supabase)
        log(JSON.stringify(discovery, null, 2))
        expect(discovery.teamsMatched).toBeGreaterThan(0)
      } else {
        log("Skipping discovery (ENRICHMENT_SEED_ONLY=1)")
      }

      const allUnmatched: { team: string; name: string }[] = []
      const byMethodTotals: Record<string, number> = {}
      let totalProcessed = 0
      let totalMatched = 0
      let batch = 0

      log("Phase 2: seedEnrichment loop…")
      while (true) {
        batch += 1
        const result = await seedBatch(supabase, SEED_BATCH)
        totalProcessed += result.processed
        totalMatched += result.matched
        for (const [method, count] of Object.entries(result.byMethod)) {
          byMethodTotals[method] = (byMethodTotals[method] ?? 0) + count
        }
        allUnmatched.push(...result.unmatched)
        log(
          `batch ${batch}: processed=${result.processed} matched=${result.matched} remaining=${result.remaining}`
        )
        if (result.remaining === 0 || result.processed === 0) break
      }

      const uniqueUnmatched = [
        ...new Map(
          allUnmatched.map((row) => [`${row.team}:${row.name}`, row])
        ).values(),
      ].sort((a, b) =>
        a.team === b.team
          ? a.name.localeCompare(b.name)
          : a.team.localeCompare(b.team)
      )

      log(
        JSON.stringify(
          {
            totalProcessed,
            totalMatched,
            byMethod: byMethodTotals,
            unmatchedCount: uniqueUnmatched.length,
            unmatched: uniqueUnmatched,
          },
          null,
          2
        )
      )

      expect(totalProcessed).toBeGreaterThan(0)
    },
    60 * 60 * 1000
  )
})
