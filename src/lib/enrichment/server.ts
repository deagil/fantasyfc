import { createServerFn } from "@tanstack/react-start"

import { requireServerAuthUser } from "@/lib/auth/auth.server"
import { matchPlayers, matchTeams } from "@/lib/enrichment/matching"
import type {
  DiscoverEnrichmentResult,
  EnrichmentFplElement,
  EnrichmentFplTeam,
  EnrichmentPayload,
  PlayerEnrichmentBio,
  PlayerEnrichmentDTO,
  SeedEnrichmentResult,
  SportsDbPlayer,
  SportsDbTeam,
  TeamEnrichmentDTO,
} from "@/lib/enrichment/model"
import {
  extractEntityLinks,
  SPORTSDB_LEAGUE_PAGE,
  teamPageUrl,
} from "@/lib/enrichment/pages"
import { cached } from "@/lib/fpl/cache"
import { createServiceRoleClient } from "@/lib/supabase/admin"

const FPL_API_BASE = "https://fantasy.premierleague.com/api"
const SPORTSDB_API_BASE = "https://www.thesportsdb.com/api/v1/json"

const HOUR = 60 * 60 * 1000
const ENRICHMENT_TTL = 6 * HOUR
const BOOTSTRAP_TTL = 3 * HOUR
/** Gap between SportsDB requests (free API tier: 30/min). */
const REQUEST_GAP_MS = 500
const SEED_DEFAULT_BATCH = 25
const SEED_MAX_BATCH = 50
const USER_AGENT = "deadline-fpl-companion/1.0"

function sportsDbKey(): string {
  return process.env.SPORTSDB_API_KEY ?? "123"
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type EnrichmentBootstrap = {
  teams: EnrichmentFplTeam[]
  elements: EnrichmentFplElement[]
}

/**
 * Shares the "bootstrap:full" cache entry with the ratings module — both
 * store the raw parsed bootstrap, so the runtime objects carry every field
 * and each module narrows the type to what it consumes.
 */
async function fetchEnrichmentBootstrap(): Promise<EnrichmentBootstrap> {
  return cached("bootstrap:full", BOOTSTRAP_TTL, async () => {
    const response = await fetch(`${FPL_API_BASE}/bootstrap-static/`)
    if (!response.ok) {
      throw new Error("Failed to fetch FPL bootstrap data")
    }
    const data = (await response.json()) as {
      events: unknown[]
      teams: EnrichmentFplTeam[]
      elements: EnrichmentFplElement[]
    }
    return { events: data.events, teams: data.teams, elements: data.elements }
  })
}

async function fetchSportsDbApi<T>(path: string): Promise<T> {
  const response = await fetch(`${SPORTSDB_API_BASE}/${sportsDbKey()}/${path}`, {
    headers: { "User-Agent": USER_AGENT },
  })
  if (response.status === 429) {
    throw new Error(
      "TheSportsDB rate limit hit — wait a minute and re-run this step."
    )
  }
  if (!response.ok) {
    throw new Error(`TheSportsDB request failed (${response.status}): ${path}`)
  }
  return (await response.json()) as T
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

/**
 * Phase 1 — discovery. Reads entity IDs from the league page and each team
 * page (IDs only; all data comes from the API), looks up each team through
 * the official API, matches teams to FPL, stores team enrichment, and queues
 * discovered player IDs in sportsdb_candidates for the batched seed step.
 * ~1 league page + 20 team pages + 20 team API lookups per run. Idempotent.
 */
export const discoverEnrichment = createServerFn({ method: "POST" }).handler(
  async (): Promise<DiscoverEnrichmentResult> => {
    await requireServerAuthUser()

    const supabase = createServiceRoleClient()
    const bootstrap = await fetchEnrichmentBootstrap()

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
      if (!team) {
        continue
      }
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
      if (error) {
        throw new Error(`Failed to store team enrichment: ${error.message}`)
      }
    }

    // Queue candidates only for teams that matched an FPL team (the league
    // page can list next season's promoted clubs before FPL rolls over).
    const relevantCandidates = candidateRows.filter((row) =>
      matchedSdbIds.has(row.sportsdb_team_id)
    )

    for (let index = 0; index < relevantCandidates.length; index += 500) {
      const chunk = relevantCandidates.slice(index, index + 500)
      const { error } = await supabase
        .from("sportsdb_candidates")
        .upsert(chunk, { onConflict: "sportsdb_id", ignoreDuplicates: true })
      if (error) {
        throw new Error(`Failed to queue candidates: ${error.message}`)
      }
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
)

type CandidateRow = {
  sportsdb_id: number
  sportsdb_team_id: number
}

type TeamEnrichmentRow = {
  team_code: number
  sportsdb_id: number
  name: string
}

/**
 * Phase 2 — batched player seeding. Works through sportsdb_candidates:
 * looks up each player via the official API, matches to the FPL roster of
 * their team (DOB first, name fallback), and upserts player_enrichment.
 * Call repeatedly until `remaining` is 0 (~25 players / ~15s per call under
 * the free-tier rate limit).
 */
export const seedEnrichment = createServerFn({ method: "POST" })
  .validator((data: { batchSize?: number } | undefined) => {
    const batchSize = Math.min(
      SEED_MAX_BATCH,
      Math.max(1, Math.floor(Number(data?.batchSize ?? SEED_DEFAULT_BATCH)))
    )
    return { batchSize }
  })
  .handler(async ({ data }): Promise<SeedEnrichmentResult> => {
    await requireServerAuthUser()

    const supabase = createServiceRoleClient()
    const bootstrap = await fetchEnrichmentBootstrap()

    const { data: teamRowsRaw, error: teamError } = await supabase
      .from("team_enrichment")
      .select("team_code, sportsdb_id, name")
      .limit(100)
    if (teamError) {
      throw new Error(`Failed to load team enrichment: ${teamError.message}`)
    }
    const teamRows = teamRowsRaw as TeamEnrichmentRow[]

    // sportsdb team id → FPL roster for that team.
    const rosterBySdbTeam = new Map<number, EnrichmentFplElement[]>()
    const teamNameBySdbTeam = new Map<number, string>()
    for (const row of teamRows) {
      const fplTeam = bootstrap.teams.find((t) => t.code === row.team_code)
      if (!fplTeam) {
        continue
      }
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
      .limit(data.batchSize)
    if (candidateError) {
      throw new Error(`Failed to load candidates: ${candidateError.message}`)
    }
    const candidates = candidatesRaw as CandidateRow[]

    const result: SeedEnrichmentResult = {
      processed: 0,
      matched: 0,
      remaining: 0,
      byMethod: {},
      unmatched: [],
    }

    // Look up each candidate through the API, grouped by team.
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
          throw new Error(
            `Failed to store player enrichment: ${error.message}`
          )
        }
      }
    }

    // Mark the whole batch processed (matched or not) so progress is made
    // even on unmatched entries; matched_player_code records the outcome.
    const processedAt = new Date().toISOString()
    for (const candidate of candidates) {
      const { error } = await supabase
        .from("sportsdb_candidates")
        .update({
          processed_at: processedAt,
          matched_player_code:
            matchedBySdbId.get(candidate.sportsdb_id) ?? null,
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
  })

type PlayerRow = {
  player_code: number
  sportsdb_id: number
  cutout_url: string | null
  render_url: string | null
  thumb_url: string | null
  position: string | null
  creative_commons: boolean
  bio: PlayerEnrichmentBio
  synced_at: string
}

type TeamRow = {
  team_code: number
  sportsdb_id: number
  name: string
  badge_url: string | null
  logo_url: string | null
  equipment_url: string | null
  banner_url: string | null
  colours: string[]
  stadium: TeamEnrichmentDTO["stadium"]
  synced_at: string
}

/**
 * All enrichment data (players + teams), served from Supabase with an
 * in-memory TTL. Keyed by stable FPL codes; join client-side via
 * element.code / team.code.
 */
export const getEnrichment = createServerFn({ method: "GET" }).handler(() =>
  cached("enrichment:payload", ENRICHMENT_TTL, async (): Promise<EnrichmentPayload> => {
    const supabase = createServiceRoleClient()

    const [playersResult, teamsResult] = await Promise.all([
      supabase
        .from("player_enrichment")
        .select(
          "player_code, sportsdb_id, cutout_url, render_url, thumb_url, position, creative_commons, bio, synced_at"
        )
        .order("player_code", { ascending: true })
        .limit(2000),
      supabase
        .from("team_enrichment")
        .select(
          "team_code, sportsdb_id, name, badge_url, logo_url, equipment_url, banner_url, colours, stadium, synced_at"
        )
        .order("team_code", { ascending: true })
        .limit(100),
    ])

    if (playersResult.error) {
      throw new Error(
        `Failed to load player enrichment: ${playersResult.error.message}`
      )
    }
    if (teamsResult.error) {
      throw new Error(
        `Failed to load team enrichment: ${teamsResult.error.message}`
      )
    }

    const playerRows = playersResult.data as PlayerRow[]
    const teamRows = teamsResult.data as TeamRow[]

    const players: PlayerEnrichmentDTO[] = playerRows.map((row) => ({
      playerCode: row.player_code,
      sportsdbId: row.sportsdb_id,
      cutoutUrl: row.cutout_url,
      renderUrl: row.render_url,
      thumbUrl: row.thumb_url,
      position: row.position,
      creativeCommons: row.creative_commons,
      bio: row.bio,
    }))

    const teams: TeamEnrichmentDTO[] = teamRows.map((row) => ({
      teamCode: row.team_code,
      sportsdbId: row.sportsdb_id,
      name: row.name,
      badgeUrl: row.badge_url,
      logoUrl: row.logo_url,
      equipmentUrl: row.equipment_url,
      bannerUrl: row.banner_url,
      colours: row.colours,
      stadium: row.stadium,
    }))

    const syncedAt = [...playerRows, ...teamRows]
      .map((row) => row.synced_at)
      .sort()
      .at(-1)

    return { syncedAt: syncedAt ?? null, players, teams }
  })
)
