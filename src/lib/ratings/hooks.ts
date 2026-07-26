import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"

import type {
  PlayerRatingSummary,
  PlayerRatingsPayload,
  PlayerSeasonHistoryEntry,
} from "@/lib/ratings/model"
import { RATINGS_STALE_TIME, ratingsKeys } from "@/lib/ratings/queries"
import {
  getPlayerRatingDetail,
  getPlayerRatings,
  getPlayerSeasonHistory,
} from "@/lib/ratings/server"

/** All player ratings for the latest gameweek snapshot (compact shape). */
export function usePlayerRatings() {
  const fetchRatings = useServerFn(getPlayerRatings)

  return useQuery<PlayerRatingsPayload>({
    queryKey: ratingsKeys.list(),
    queryFn: () => fetchRatings(),
    staleTime: RATINGS_STALE_TIME,
  })
}

/** Ratings keyed by FPL element id, for joining onto picks/squads. */
export function usePlayerRatingsById(): {
  ratingsById: Map<number, PlayerRatingSummary>
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = usePlayerRatings()

  const ratingsById = useMemo(() => {
    const map = new Map<number, PlayerRatingSummary>()
    for (const rating of data?.ratings ?? []) {
      map.set(rating.id, rating)
    }
    return map
  }, [data])

  return { ratingsById, isLoading, error: error ?? null }
}

/** Full category/sub/stat breakdown for one player (detail card). */
export function usePlayerRatingDetail(playerId: number | null) {
  const fetchDetail = useServerFn(getPlayerRatingDetail)

  return useQuery({
    queryKey: ratingsKeys.detail(playerId ?? -1),
    queryFn: () => fetchDetail({ data: { playerId: playerId as number } }),
    enabled: playerId !== null,
    staleTime: RATINGS_STALE_TIME,
  })
}

/** Past-season aggregates for one player, oldest season first. */
export function usePlayerSeasonHistory(playerCode: number | null) {
  const fetchHistory = useServerFn(getPlayerSeasonHistory)

  return useQuery<PlayerSeasonHistoryEntry[]>({
    queryKey: ratingsKeys.seasonHistory(playerCode ?? -1),
    queryFn: () => fetchHistory({ data: { playerCode: playerCode as number } }),
    enabled: playerCode !== null,
    staleTime: RATINGS_STALE_TIME,
  })
}
