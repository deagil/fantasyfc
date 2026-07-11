export const RATINGS_STALE_TIME = 3 * 60 * 60 * 1000

export const ratingsKeys = {
  all: ["ratings"] as const,
  list: () => [...ratingsKeys.all, "list"] as const,
  detail: (playerId: number) =>
    [...ratingsKeys.all, "detail", playerId] as const,
}
