import "@tanstack/react-start/server-only"

import { cached } from "@/lib/fpl/cache"
import type { FplBootstrap, FplEntry } from "@/lib/fpl/types"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { getSeasonLabel } from "@/lib/trophies/season"
import type {
  ClaimPreview,
  ClaimResult,
  EntryClaim,
  LeagueTrophy,
} from "@/lib/trophies/types"

const FPL_API_BASE = "https://fantasy.premierleague.com/api"
const HOUR = 60 * 60 * 1000

async function fetchBootstrap(): Promise<FplBootstrap> {
  return cached("bootstrap", 3 * HOUR, async () => {
    const response = await fetch(`${FPL_API_BASE}/bootstrap-static/`)

    if (!response.ok) {
      throw new Error("Could not load FPL season data")
    }

    return (await response.json()) as FplBootstrap
  })
}

async function fetchEntry(teamId: number): Promise<FplEntry> {
  const response = await fetch(`${FPL_API_BASE}/entry/${teamId}/`)

  if (!response.ok) {
    throw new Error("Team not found")
  }

  return (await response.json()) as FplEntry
}

function mapClaim(row: {
  id: string
  user_id: string
  season: string
  fpl_entry_id: number
  entry_name: string
  player_name: string
  claimed_at: string
}): EntryClaim {
  return {
    id: row.id,
    user_id: row.user_id,
    season: row.season,
    fpl_entry_id: row.fpl_entry_id,
    entry_name: row.entry_name,
    player_name: row.player_name,
    claimed_at: row.claimed_at,
  }
}

function mapTrophy(row: {
  id: string
  league_id: number
  season: string
  rank: number
  medal: string
  league_name: string
  league_size: number
  entry_id: number
  entry_name: string
  player_name: string
  points: number
  margin: number
  banked_at: string
}): LeagueTrophy {
  return {
    id: row.id,
    league_id: row.league_id,
    season: row.season,
    rank: row.rank as 1 | 2 | 3,
    medal: row.medal as LeagueTrophy["medal"],
    league_name: row.league_name,
    league_size: row.league_size,
    entry_id: row.entry_id,
    entry_name: row.entry_name,
    player_name: row.player_name,
    points: row.points,
    margin: row.margin,
    banked_at: row.banked_at,
  }
}

export async function resolveCurrentSeasonLabel(): Promise<string> {
  const bootstrap = await fetchBootstrap()
  return getSeasonLabel(bootstrap.events)
}

export async function previewEntryClaim(
  teamId: number
): Promise<ClaimPreview> {
  const [bootstrap, entry] = await Promise.all([
    fetchBootstrap(),
    fetchEntry(teamId),
  ])

  return {
    season: getSeasonLabel(bootstrap.events),
    fplEntryId: entry.id,
    entryName: entry.name,
    playerName: `${entry.player_first_name} ${entry.player_last_name}`.trim(),
  }
}

export async function getEntryClaimForUser(
  userId: string,
  season?: string
): Promise<EntryClaim | null> {
  const resolvedSeason = season ?? (await resolveCurrentSeasonLabel())
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("entry_claims")
    .select("*")
    .eq("user_id", userId)
    .eq("season", resolvedSeason)
    .maybeSingle()

  if (error) {
    throw new Error("Could not load entry claim")
  }

  return data ? mapClaim(data) : null
}

export async function claimEntryForUser(
  userId: string,
  teamId: number
): Promise<ClaimResult> {
  const preview = await previewEntryClaim(teamId)
  const supabase = createServiceRoleClient()

  const existingForUser = await getEntryClaimForUser(userId, preview.season)
  if (existingForUser) {
    return { status: "already_linked", claim: existingForUser }
  }

  const { data: existingEntry, error: existingError } = await supabase
    .from("entry_claims")
    .select("*")
    .eq("season", preview.season)
    .eq("fpl_entry_id", preview.fplEntryId)
    .maybeSingle()

  if (existingError) {
    throw new Error("Could not check existing claim")
  }

  if (existingEntry) {
    return {
      status: "already_claimed",
      season: preview.season,
      fplEntryId: preview.fplEntryId,
    }
  }

  const { data, error } = await supabase
    .from("entry_claims")
    .insert({
      user_id: userId,
      season: preview.season,
      fpl_entry_id: preview.fplEntryId,
      entry_name: preview.entryName,
      player_name: preview.playerName,
    })
    .select("*")
    .single()

  if (error) {
    // Race: another claim landed between check and insert
    if (error.code === "23505") {
      const again = await getEntryClaimForUser(userId, preview.season)
      if (again) {
        return { status: "already_linked", claim: again }
      }

      return {
        status: "already_claimed",
        season: preview.season,
        fplEntryId: preview.fplEntryId,
      }
    }

    throw new Error("Could not claim entry")
  }

  return { status: "claimed", claim: mapClaim(data) }
}

export async function submitClaimHelpRequest(input: {
  requesterId: string
  season: string
  fplEntryId: number
  message: string
}): Promise<{ id: string }> {
  const trimmed = input.message.trim()
  if (trimmed.length < 5) {
    throw new Error("Message is too short")
  }

  if (trimmed.length > 2000) {
    throw new Error("Message is too long")
  }

  const supabase = createServiceRoleClient()

  const { data: existingClaim } = await supabase
    .from("entry_claims")
    .select("user_id")
    .eq("season", input.season)
    .eq("fpl_entry_id", input.fplEntryId)
    .maybeSingle()

  const { data, error } = await supabase
    .from("claim_help_requests")
    .insert({
      requester_id: input.requesterId,
      season: input.season,
      fpl_entry_id: input.fplEntryId,
      existing_claim_user_id: existingClaim?.user_id ?? null,
      message: trimmed,
      status: "open",
    })
    .select("id")
    .single()

  if (error) {
    throw new Error("Could not submit help request")
  }

  return { id: data.id }
}

export async function getTrophiesForUser(
  userId: string,
  season?: string
): Promise<{ claim: EntryClaim | null; trophies: LeagueTrophy[] }> {
  const resolvedSeason = season ?? (await resolveCurrentSeasonLabel())
  const claim = await getEntryClaimForUser(userId, resolvedSeason)

  if (!claim) {
    return { claim: null, trophies: [] }
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("league_trophies")
    .select("*")
    .eq("season", claim.season)
    .eq("entry_id", claim.fpl_entry_id)
    .order("rank", { ascending: true })

  if (error) {
    throw new Error("Could not load trophies")
  }

  return {
    claim,
    trophies: data.map(mapTrophy),
  }
}
