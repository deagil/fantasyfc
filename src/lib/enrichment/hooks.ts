import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"

import type {
  EnrichmentPayload,
  PlayerEnrichmentDTO,
  TeamEnrichmentDTO,
} from "@/lib/enrichment/model"
import { ENRICHMENT_STALE_TIME, enrichmentKeys } from "@/lib/enrichment/queries"
import { getEnrichment } from "@/lib/enrichment/server"

/** Full enrichment payload (players + teams). */
export function useEnrichment() {
  const fetchEnrichment = useServerFn(getEnrichment)

  return useQuery<EnrichmentPayload>({
    queryKey: enrichmentKeys.payload(),
    queryFn: () => fetchEnrichment(),
    staleTime: ENRICHMENT_STALE_TIME,
  })
}

/**
 * Enrichment keyed by stable FPL codes for joining onto bootstrap data:
 * players by `element.code`, teams by `team.code`.
 */
export function useEnrichmentMaps(): {
  playersByCode: Map<number, PlayerEnrichmentDTO>
  teamsByCode: Map<number, TeamEnrichmentDTO>
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useEnrichment()

  const maps = useMemo(() => {
    const playersByCode = new Map<number, PlayerEnrichmentDTO>()
    const teamsByCode = new Map<number, TeamEnrichmentDTO>()
    for (const player of data?.players ?? []) {
      playersByCode.set(player.playerCode, player)
    }
    for (const team of data?.teams ?? []) {
      teamsByCode.set(team.teamCode, team)
    }
    return { playersByCode, teamsByCode }
  }, [data])

  return { ...maps, isLoading, error: error ?? null }
}
