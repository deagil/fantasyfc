import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"

import type { PlayerRatingSummary, PlayerRatingsPayload } from "@/lib/ratings/model"
import { RATINGS_STALE_TIME, ratingsKeys } from "@/lib/ratings/queries"
import { getPlayerRatingDetail, getPlayerRatings } from "@/lib/ratings/server"

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
