import { createServerFn } from "@tanstack/react-start"

import { cached } from "@/lib/fpl/cache"
import type {
  FplBootstrap,
  FplEntry,
  FplEntryHistory,
  FplEntryPicks,
  FplEventLive,
  FplFixture,
  FplLeagueStandings,
} from "@/lib/fpl/types"

const FPL_API_BASE = "https://fantasy.premierleague.com/api"

const HOUR = 60 * 60 * 1000

export const getFplEntry = createServerFn({ method: "POST" })
  .validator((data: { teamId: number }) => data)
  .handler(async ({ data }) => {
    const response = await fetch(`${FPL_API_BASE}/entry/${data.teamId}/`)

    if (!response.ok) {
      throw new Error("Team not found")
    }

    return (await response.json()) as FplEntry
  })

export const getFplEntryHistory = createServerFn({ method: "POST" })
  .validator((data: { teamId: number }) => data)
  .handler(async ({ data }) => {
    const response = await fetch(`${FPL_API_BASE}/entry/${data.teamId}/history/`)

    if (!response.ok) {
      throw new Error("Team history not found")
    }

    return (await response.json()) as FplEntryHistory
  })

export const getFplBootstrap = createServerFn({ method: "GET" }).handler(
  async () =>
    cached("bootstrap", 3 * HOUR, async () => {
      const response = await fetch(`${FPL_API_BASE}/bootstrap-static/`)

      if (!response.ok) {
        throw new Error("Could not load FPL season data")
      }

      const data = (await response.json()) as {
        events: FplBootstrap["events"]
        teams: FplBootstrap["teams"]
        elements: Array<{ id: number; web_name: string }>
      }

      return {
        events: data.events,
        teams: data.teams,
        elements: data.elements.map((element) => ({
          id: element.id,
          web_name: element.web_name,
        })),
      } satisfies FplBootstrap
    })
)

export const getFplFixtures = createServerFn({ method: "POST" })
  .validator((data: { event?: number }) => data)
  .handler(async ({ data }) =>
    cached(`fixtures:${data.event ?? "all"}`, HOUR, async () => {
      const url = data.event
        ? `${FPL_API_BASE}/fixtures/?event=${data.event}`
        : `${FPL_API_BASE}/fixtures/`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Could not load fixtures")
      }

      return (await response.json()) as FplFixture[]
    })
  )

export const getFplEntryPicks = createServerFn({ method: "POST" })
  .validator((data: { teamId: number; event: number }) => data)
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
  .validator((data: { event: number }) => data)
  .handler(async ({ data }) => {
    const response = await fetch(`${FPL_API_BASE}/event/${data.event}/live/`)

    if (!response.ok) {
      throw new Error("Live gameweek data not found")
    }

    return (await response.json()) as FplEventLive
  })

export const getFplLeagueStandings = createServerFn({ method: "POST" })
  .validator((data: { leagueId: number; page?: number }) => data)
  .handler(async ({ data }) => {
    const page = data.page ?? 1

    return cached(`standings:${data.leagueId}:${page}`, HOUR, async () => {
      const response = await fetch(
        `${FPL_API_BASE}/leagues-classic/${data.leagueId}/standings/?page=${page}`
      )

      if (!response.ok) {
        throw new Error("League standings not found")
      }

      return (await response.json()) as FplLeagueStandings
    })
  })
