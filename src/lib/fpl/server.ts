import { createServerFn } from "@tanstack/react-start"

import { cached, cachedWithTtl } from "@/lib/fpl/cache"
import {
  buildLeagueRankHistory,
  getRecentFinishedGameweeks,
  LEAGUE_RANK_HISTORY_TOP,
} from "@/lib/fpl/league-rank-history"
import type {
  FplBootstrap,
  FplEntry,
  FplEntryHistory,
  FplEntryPicks,
  FplEventLive,
  FplEventStatus,
  FplFixture,
  FplLeagueStandings,
  LeagueRankHistory,
} from "@/lib/fpl/types"
import {
  parseEventId,
  parseLeagueId,
  parseOptionalEventId,
  parseStandingsPage,
  parseTeamId,
  parseWeeksCount,
} from "@/lib/fpl/validate"

const FPL_API_BASE = "https://fantasy.premierleague.com/api"

const HOUR = 60 * 60 * 1000
const FIVE_MINUTES = 5 * 60 * 1000
const THIRTY_SECONDS = 30_000
const KICKOFF_SOON_MS = 15 * 60 * 1000
const MAX_STANDINGS_PAGES = 10
const HISTORY_FETCH_CONCURRENCY = 16

function fixturesCacheTtlMs(fixtures: FplFixture[], now = Date.now()): number {
  const hasLive = fixtures.some(
    (fixture) => fixture.started && !fixture.finished
  )
  if (hasLive) {
    return THIRTY_SECONDS
  }

  const kickoffSoon = fixtures.some((fixture) => {
    if (!fixture.kickoff_time || fixture.finished || fixture.started) {
      return false
    }
    const kickoff = new Date(fixture.kickoff_time).getTime()
    return kickoff > now && kickoff - now <= KICKOFF_SOON_MS
  })
  if (kickoffSoon) {
    return FIVE_MINUTES
  }

  return HOUR
}

function normalizeFixture(raw: FplFixture): FplFixture {
  return {
    id: raw.id,
    code: raw.code,
    event: raw.event,
    team_h: raw.team_h,
    team_a: raw.team_a,
    team_h_score: raw.team_h_score,
    team_a_score: raw.team_a_score,
    team_h_difficulty: raw.team_h_difficulty,
    team_a_difficulty: raw.team_a_difficulty,
    kickoff_time: raw.kickoff_time,
    finished: raw.finished,
    finished_provisional: raw.finished_provisional,
    started: raw.started,
    minutes: raw.minutes,
    provisional_start_time: raw.provisional_start_time,
    stats: raw.stats ?? [],
  }
}

async function fetchFplEntryHistory(entryId: number): Promise<FplEntryHistory> {
  return cached(`history:${entryId}`, HOUR, async () => {
    const response = await fetch(`${FPL_API_BASE}/entry/${entryId}/history/`)

    if (!response.ok) {
      throw new Error("Team history not found")
    }

    return (await response.json()) as FplEntryHistory
  })
}

async function fetchAllLeagueStandings(leagueId: number) {
  const standings = []
  let startEvent = 1
  let page = 1
  let hasNext = true

  while (hasNext && page <= MAX_STANDINGS_PAGES) {
    const response = await fetch(
      `${FPL_API_BASE}/leagues-classic/${leagueId}/standings/?page_standings=${page}`
    )

    if (!response.ok) {
      throw new Error("League standings not found")
    }

    const data = (await response.json()) as FplLeagueStandings
    if (page === 1) {
      startEvent = data.league.start_event ?? 1
    }
    standings.push(...data.standings.results)
    hasNext = data.standings.has_next
    page += 1
  }

  return { standings, startEvent }
}

async function fetchEntryHistoriesByEntry(entryIds: number[]) {
  const historiesByEntry = new Map<number, FplEntryHistory>()

  for (let index = 0; index < entryIds.length; index += HISTORY_FETCH_CONCURRENCY) {
    const batch = entryIds.slice(index, index + HISTORY_FETCH_CONCURRENCY)
    const histories = await Promise.all(
      batch.map((entryId) => fetchFplEntryHistory(entryId))
    )

    for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
      historiesByEntry.set(batch[batchIndex]!, histories[batchIndex]!)
    }
  }

  return historiesByEntry
}

export const getFplEntry = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({ teamId: parseTeamId((data as { teamId: unknown }).teamId) }))
  .handler(async ({ data }) => {
    const response = await fetch(`${FPL_API_BASE}/entry/${data.teamId}/`)

    if (!response.ok) {
      throw new Error("Team not found")
    }

    return (await response.json()) as FplEntry
  })

export const getFplEntryHistory = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({ teamId: parseTeamId((data as { teamId: unknown }).teamId) }))
  .handler(async ({ data }) => {
    const response = await fetch(`${FPL_API_BASE}/entry/${data.teamId}/history/`)

    if (!response.ok) {
      throw new Error("Team history not found")
    }

    return (await response.json()) as FplEntryHistory
  })

export const getFplBootstrap = createServerFn({ method: "GET" }).handler(
  async () =>
    cached("bootstrap:v5", 3 * HOUR, async () => {
      const response = await fetch(`${FPL_API_BASE}/bootstrap-static/`)

      if (!response.ok) {
        throw new Error("Could not load FPL season data")
      }

      const data = (await response.json()) as {
        events: FplBootstrap["events"]
        teams: Array<{
          id: number
          code: number
          name: string
          short_name: string
        }>
        elements: Array<{
          id: number
          code: number
          web_name: string
          first_name: string
          second_name: string
          team: number
          element_type: number
          now_cost: number
          form: string
          points_per_game: string
          total_points: number
          bonus: number
          defensive_contribution: number
          goals_scored: number
          assists: number
          minutes: number
          starts: number
          selected_by_percent: string
          status: string
          news: string | null
          chance_of_playing_next_round: number | null
        }>
      }

      return {
        events: data.events,
        teams: data.teams.map((team) => ({
          id: team.id,
          code: team.code,
          name: team.name,
          short_name: team.short_name,
        })),
        elements: data.elements.map((element) => ({
          id: element.id,
          code: element.code,
          web_name: element.web_name,
          first_name: element.first_name,
          second_name: element.second_name,
          team: element.team,
          element_type: element.element_type as FplBootstrap["elements"][number]["element_type"],
          now_cost: element.now_cost,
          form: element.form,
          points_per_game: element.points_per_game ?? "0.0",
          total_points: element.total_points,
          bonus: element.bonus,
          defensive_contribution: element.defensive_contribution ?? 0,
          goals_scored: element.goals_scored ?? 0,
          assists: element.assists ?? 0,
          minutes: element.minutes ?? 0,
          starts: element.starts ?? 0,
          selected_by_percent: element.selected_by_percent,
          status: element.status as FplBootstrap["elements"][number]["status"],
          news: element.news ?? "",
          chance_of_playing_next_round: element.chance_of_playing_next_round,
        })),
      } satisfies FplBootstrap
    })
)

export const getFplFixtures = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({
    event: parseOptionalEventId((data as { event?: unknown }).event),
  }))
  .handler(async ({ data }) => {
    const event = data.event

    return cachedWithTtl(`fixtures:${event ?? "all"}`, async () => {
      const url = event
        ? `${FPL_API_BASE}/fixtures/?event=${event}`
        : `${FPL_API_BASE}/fixtures/`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Could not load fixtures")
      }

      const raw = (await response.json()) as FplFixture[]
      const value = raw.map(normalizeFixture)

      return {
        value,
        ttlMs: fixturesCacheTtlMs(value),
      }
    })
  })

export const getFplEventStatus = createServerFn({ method: "GET" }).handler(
  async () =>
    cached("event-status", FIVE_MINUTES, async () => {
      const response = await fetch(`${FPL_API_BASE}/event-status/`)

      if (!response.ok) {
        throw new Error("Could not load event status")
      }

      return (await response.json()) as FplEventStatus
    })
)

export const getFplEntryPicks = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({
    teamId: parseTeamId((data as { teamId: unknown }).teamId),
    event: parseEventId((data as { event: unknown }).event),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(
      `${FPL_API_BASE}/entry/${data.teamId}/event/${data.event}/picks/`
    )

    if (!response.ok) {
      throw new Error("Team picks not found")
    }

    return (await response.json()) as FplEntryPicks
  })

export const getFplEventLive = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({ event: parseEventId((data as { event: unknown }).event) }))
  .handler(async ({ data }) => {
    const response = await fetch(`${FPL_API_BASE}/event/${data.event}/live/`)

    if (!response.ok) {
      throw new Error("Live gameweek data not found")
    }

    const raw = (await response.json()) as FplEventLive

    return {
      elements: raw.elements.map((element) => ({
        id: element.id,
        stats: {
          minutes: element.stats?.minutes ?? 0,
          goals_scored: element.stats?.goals_scored ?? 0,
          assists: element.stats?.assists ?? 0,
          bonus: element.stats?.bonus ?? 0,
          bps: element.stats?.bps ?? 0,
          defensive_contribution: element.stats?.defensive_contribution ?? 0,
          total_points: element.stats?.total_points ?? 0,
        },
        explain: element.explain ?? [],
      })),
    } satisfies FplEventLive
  })

export const getFplLeagueStandings = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const payload = data as { leagueId: unknown; page?: unknown }

    return {
      leagueId: parseLeagueId(payload.leagueId),
      page: parseStandingsPage(payload.page),
    }
  })
  .handler(async ({ data }) => {
    const { leagueId, page } = data

    return cached(`standings:${leagueId}:${page}`, HOUR, async () => {
      const response = await fetch(
        `${FPL_API_BASE}/leagues-classic/${leagueId}/standings/?page_standings=${page}`
      )

      if (!response.ok) {
        throw new Error("League standings not found")
      }

      return (await response.json()) as FplLeagueStandings
    })
  })

export const getFplLeagueRankHistory = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const payload = data as {
      leagueId: unknown
      weeks?: unknown
      currentTeamId?: unknown
    }

    const currentTeamId = payload.currentTeamId

    return {
      leagueId: parseLeagueId(payload.leagueId),
      weeks: parseWeeksCount(payload.weeks),
      currentTeamId:
        currentTeamId === undefined || currentTeamId === null
          ? null
          : parseTeamId(currentTeamId),
    }
  })
  .handler(async ({ data }) => {
    const { leagueId, weeks, currentTeamId } = data

    return cached(
      `league-rank-history:v10:${leagueId}:${weeks}:${LEAGUE_RANK_HISTORY_TOP}:${currentTeamId ?? "anon"}`,
      HOUR,
      async (): Promise<LeagueRankHistory> => {
        const bootstrap = await cached("bootstrap", 3 * HOUR, async () => {
          const response = await fetch(`${FPL_API_BASE}/bootstrap-static/`)

          if (!response.ok) {
            throw new Error("Could not load FPL season data")
          }

          return (await response.json()) as FplBootstrap
        })

        const gameweeks = getRecentFinishedGameweeks(bootstrap, weeks)

        if (gameweeks.length === 0) {
          return {
            gameweeks: [],
            teams: [],
            series: [],
          }
        }

        const { standings, startEvent } = await fetchAllLeagueStandings(leagueId)
        const entryIds = [...new Set(standings.map((standing) => standing.entry))]
        const historiesByEntry = await fetchEntryHistoriesByEntry(entryIds)

        return buildLeagueRankHistory({
          standings,
          historiesByEntry,
          gameweeks,
          currentTeamId,
          startEvent,
        })
      }
    )
  })
