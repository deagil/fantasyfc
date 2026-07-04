import { useQuery } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"

import {
  FPL_STALE_TIME,
  LIVE_REFRESH_MS,
  fplKeys,
  getFixtureEventIds,
} from "@/lib/fpl/queries"
import {
  buildPointsByElementId,
  getTopScorers,
  type TeamTopScorer,
} from "@/lib/fpl/picks"
import {
  getFplBootstrap,
  getFplEntry,
  getFplEntryHistory,
  getFplEntryPicks,
  getFplEventLive,
  getFplFixtures,
  getFplLeagueStandings,
} from "@/lib/fpl/server"
import type { FplBootstrap, FplElement, FplFixture } from "@/lib/fpl/types"

export function useFplBootstrapQuery() {
  const fetchBootstrap = useServerFn(getFplBootstrap)

  return useQuery({
    queryKey: fplKeys.bootstrap(),
    queryFn: () => fetchBootstrap(),
    staleTime: FPL_STALE_TIME.bootstrap,
  })
}

export function useFplFixturesQuery(
  bootstrap: FplBootstrap | undefined,
  options?: { enabled?: boolean }
) {
  const fetchFixtures = useServerFn(getFplFixtures)
  const eventIds = bootstrap ? getFixtureEventIds(bootstrap) : []
  const enabled = (options?.enabled ?? true) && eventIds.length > 0

  return useQuery({
    queryKey: fplKeys.fixtures(eventIds),
    queryFn: async () => {
      const fixtureGroups = await Promise.all(
        eventIds.map((eventId) => fetchFixtures({ data: { event: eventId } }))
      )
      return fixtureGroups.flat() as FplFixture[]
    },
    enabled,
    staleTime: FPL_STALE_TIME.fixtures,
  })
}

export function useFplEntryQuery(
  teamId: number | null,
  options?: { enabled?: boolean }
) {
  const fetchEntry = useServerFn(getFplEntry)
  const enabled = (options?.enabled ?? true) && teamId !== null

  return useQuery({
    queryKey: fplKeys.entry(teamId ?? 0),
    queryFn: () => fetchEntry({ data: { teamId: teamId! } }),
    enabled,
    staleTime: FPL_STALE_TIME.entry,
  })
}

export function useFplHistoryQuery(
  teamId: number | null,
  options?: { enabled?: boolean }
) {
  const fetchHistory = useServerFn(getFplEntryHistory)
  const enabled = (options?.enabled ?? true) && teamId !== null

  return useQuery({
    queryKey: fplKeys.history(teamId ?? 0),
    queryFn: () => fetchHistory({ data: { teamId: teamId! } }),
    enabled,
    staleTime: FPL_STALE_TIME.history,
  })
}

export function useFplStandingsQuery(
  leagueId: number | null | undefined,
  options?: { enabled?: boolean; page?: number }
) {
  const fetchStandings = useServerFn(getFplLeagueStandings)
  const page = options?.page ?? 1
  const enabled = (options?.enabled ?? true) && leagueId != null

  return useQuery({
    queryKey: fplKeys.standings(leagueId ?? 0, page),
    queryFn: () => fetchStandings({ data: { leagueId: leagueId!, page } }),
    enabled,
    staleTime: FPL_STALE_TIME.standings,
  })
}

export function useFplTopScorersQuery({
  teamId,
  eventId,
  elementsById,
  enabled,
  isLive,
}: {
  teamId: number | null
  eventId: number | null
  elementsById: Map<number, FplElement>
  enabled: boolean
  isLive: boolean
}) {
  const fetchPicks = useServerFn(getFplEntryPicks)
  const fetchLive = useServerFn(getFplEventLive)
  const queryEnabled = enabled && teamId !== null && eventId !== null

  return useQuery({
    queryKey: fplKeys.topScorers(teamId ?? 0, eventId ?? 0),
    queryFn: async (): Promise<TeamTopScorer[]> => {
      const [picksData, liveData] = await Promise.all([
        fetchPicks({ data: { teamId: teamId!, event: eventId! } }),
        fetchLive({ data: { event: eventId! } }),
      ])

      const pointsByElementId = buildPointsByElementId(liveData.elements)
      return getTopScorers(picksData.picks, pointsByElementId, elementsById)
    },
    enabled: queryEnabled,
    staleTime: FPL_STALE_TIME.picks,
    refetchInterval: isLive ? LIVE_REFRESH_MS : false,
    refetchIntervalInBackground: false,
  })
}
