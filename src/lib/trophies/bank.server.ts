import "@tanstack/react-start/server-only"

import { cached } from "@/lib/fpl/cache"
import { isSeasonComplete } from "@/lib/fpl/gameweek"
import type {
  FplBootstrap,
  FplEntry,
  FplLeagueStandings,
} from "@/lib/fpl/types"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  getSeasonLabel,
  marginToNext,
  medalForRank,
} from "@/lib/trophies/season"
import type { BankLeagueTrophiesResult } from "@/lib/trophies/types"

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

async function fetchStandingsPage1(leagueId: number): Promise<FplLeagueStandings> {
  return cached(`standings:${leagueId}:1`, HOUR, async () => {
    const response = await fetch(
      `${FPL_API_BASE}/leagues-classic/${leagueId}/standings/?page_standings=1`
    )

    if (!response.ok) {
      throw new Error("League standings not found")
    }

    return (await response.json()) as FplLeagueStandings
  })
}

/**
 * After season end, walk the entry's classic leagues and persist 1st–3rd
 * podium snapshots. Idempotent per (league_id, season).
 */
export async function bankLeagueTrophiesForTeam(
  teamId: number
): Promise<BankLeagueTrophiesResult> {
  const bootstrap = await fetchBootstrap()

  if (!isSeasonComplete(bootstrap.events)) {
    return {
      season: null,
      seasonComplete: false,
      leaguesChecked: 0,
      leaguesBanked: 0,
      trophiesInserted: 0,
    }
  }

  const season = getSeasonLabel(bootstrap.events)
  const entry = await fetchEntry(teamId)
  const classicLeagues = entry.leagues.classic
  const supabase = createServiceRoleClient()

  let leaguesBanked = 0
  let trophiesInserted = 0

  for (const league of classicLeagues) {
    const { data: existing, error: existingError } = await supabase
      .from("league_trophies")
      .select("id")
      .eq("league_id", league.id)
      .eq("season", season)
      .limit(1)

    if (existingError) {
      throw new Error(`Could not check trophies for league ${league.id}`)
    }

    if (existing.length > 0) {
      continue
    }

    const standings = await fetchStandingsPage1(league.id)
    const results = standings.standings.results
    const leagueName = standings.league.name || league.name
    const leagueSize =
      league.rank_count > 0 ? league.rank_count : results.length

    const rows = ([1, 2, 3] as const)
      .map((rank) => {
        const standing = results.find((row) => row.rank === rank)
        if (!standing) {
          return null
        }

        const nextStanding = results.find((row) => row.rank === rank + 1)

        return {
          league_id: league.id,
          season,
          rank,
          medal: medalForRank(rank),
          league_name: leagueName,
          league_size: leagueSize,
          entry_id: standing.entry,
          entry_name: standing.entry_name,
          player_name: standing.player_name,
          points: standing.total,
          margin: marginToNext(standing.total, nextStanding?.total),
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)

    if (rows.length === 0) {
      continue
    }

    const { data: inserted, error: insertError } = await supabase
      .from("league_trophies")
      .upsert(rows, {
        onConflict: "league_id,season,rank",
        ignoreDuplicates: true,
      })
      .select("id")

    if (insertError) {
      throw new Error(`Could not bank trophies for league ${league.id}`)
    }

    const insertedCount = inserted.length
    if (insertedCount > 0) {
      leaguesBanked += 1
      trophiesInserted += insertedCount
    }
  }

  return {
    season,
    seasonComplete: true,
    leaguesChecked: classicLeagues.length,
    leaguesBanked,
    trophiesInserted,
  }
}
