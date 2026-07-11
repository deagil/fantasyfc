import type { QueryClient } from "@tanstack/react-query"

import type { FplBootstrap } from "@/lib/fpl/types"

export const FPL_STALE_TIME = {
  bootstrap: 60 * 60 * 1000,
  fixtures: 60 * 60 * 1000,
  standings: 60 * 60 * 1000,
  leagueRankHistory: 60 * 60 * 1000,
  entry: 30 * 1000,
  history: 60 * 60 * 1000,
  picks: 0,
  live: 0,
} as const

export const LIVE_REFRESH_MS = 60_000

export const fplKeys = {
  all: ["fpl"] as const,
  /** v3: includes element/team code for player photos and crests. */
  bootstrap: () => [...fplKeys.all, "bootstrap", "v3"] as const,
  fixtures: (eventIds: readonly number[]) =>
    [...fplKeys.all, "fixtures", [...eventIds].sort((a, b) => a - b)] as const,
  entry: (teamId: number) => [...fplKeys.all, "entry", teamId] as const,
  history: (teamId: number) => [...fplKeys.all, "history", teamId] as const,
  standings: (leagueId: number, page = 1) =>
    [...fplKeys.all, "standings", leagueId, page] as const,
  leagueRankHistory: (
    leagueId: number,
    weeks: number,
    currentTeamId: number | null
  ) =>
    [
      ...fplKeys.all,
      "league-rank-history",
      leagueId,
      weeks,
      currentTeamId,
    ] as const,
  picks: (teamId: number, eventId: number) =>
    [...fplKeys.all, "picks", teamId, eventId] as const,
  live: (eventId: number) => [...fplKeys.all, "live", eventId] as const,
  topScorers: (teamId: number, eventId: number) =>
    [...fplKeys.all, "top-scorers", teamId, eventId] as const,
}

export function getFixtureEventIds(bootstrap: FplBootstrap): number[] {
  const currentEvent = bootstrap.events.find((event) => event.is_current)
  const nextEvent = bootstrap.events.find((event) => event.is_next)
  const ids = new Set<number>()

  if (currentEvent) {
    ids.add(currentEvent.id)
  }

  if (nextEvent) {
    ids.add(nextEvent.id)
  }

  if (ids.size === 0) {
    const lastEvent = bootstrap.events.at(-1)
    if (lastEvent) {
      ids.add(lastEvent.id)
    }
  }

  return [...ids]
}

export function removeFplTeamQueries(
  queryClient: QueryClient,
  teamId: number
): void {
  queryClient.removeQueries({ queryKey: fplKeys.entry(teamId) })
  queryClient.removeQueries({ queryKey: fplKeys.history(teamId) })
  queryClient.removeQueries({
    predicate: (query) => {
      const key = query.queryKey
      return (
        key[0] === fplKeys.all[0] &&
        (key[1] === "picks" || key[1] === "top-scorers") &&
        key[2] === teamId
      )
    },
  })
}

export async function invalidateFplSeasonQueries(
  queryClient: QueryClient
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: fplKeys.bootstrap() })
  await queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === fplKeys.all[0] && query.queryKey[1] === "fixtures",
  })
}

export async function invalidateFplTeamQueries(
  queryClient: QueryClient,
  teamId: number
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: fplKeys.entry(teamId) })
  await queryClient.invalidateQueries({ queryKey: fplKeys.history(teamId) })
}
