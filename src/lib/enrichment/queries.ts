export const ENRICHMENT_STALE_TIME = 6 * 60 * 60 * 1000

export const enrichmentKeys = {
  all: ["enrichment"] as const,
  payload: () => [...enrichmentKeys.all, "payload"] as const,
}
