import type { FplEntry, FplEntryHistory, FplGameweekHistory } from "@/lib/fpl/types"

const RECENT_GAMEWEEKS = 6

export type SeasonSummary = {
  rank: number
  totalPoints: number
  teamValue: number
  averagePoints: number
  highestPoints: number
  lowestPoints: number
  totalTransfers: number
}

export function getRecentGameweeks(
  gameweeks: FplGameweekHistory[],
  count = RECENT_GAMEWEEKS
): FplGameweekHistory[] {
  return gameweeks.slice(-count)
}

export function getAveragePoints(gameweeks: FplGameweekHistory[]): number {
  if (gameweeks.length === 0) {
    return 0
  }

  const total = gameweeks.reduce((sum, gameweek) => sum + gameweek.points, 0)
  return Math.round(total / gameweeks.length)
}

export function formatExplicitRank(rank: number): string {
  return rank.toLocaleString()
}

export function getSeasonSummary(
  entry: FplEntry,
  history: FplEntryHistory
): SeasonSummary {
  const gameweeks = history.current
  const points = gameweeks.map((gameweek) => gameweek.points)
  const totalTransfers = gameweeks.reduce(
    (sum, gameweek) => sum + gameweek.event_transfers,
    0
  )
  const latestGameweek = gameweeks.at(-1)

  return {
    rank: entry.summary_overall_rank,
    totalPoints: entry.summary_overall_points,
    teamValue: latestGameweek?.value ?? entry.last_deadline_value,
    averagePoints: getAveragePoints(gameweeks),
    highestPoints: points.length > 0 ? Math.max(...points) : 0,
    lowestPoints: points.length > 0 ? Math.min(...points) : 0,
    totalTransfers,
  }
}

export function formatFplRank(rank: number): string {
  if (rank >= 1_000_000) {
    return `${(rank / 1_000_000).toFixed(1)}M`
  }

  if (rank >= 1_000) {
    return `${(rank / 1_000).toFixed(1)}K`
  }

  return rank.toLocaleString()
}

export function formatOverallRank(rank: number): string {
  if (rank >= 1_000_000) {
    return `${(rank / 1_000_000).toFixed(1)}M`
  }

  if (rank >= 10_000) {
    return `${Math.round(rank / 1_000)}K`
  }

  return rank.toString()
}

export function getOverallRankChange(
  gameweeks: FplGameweekHistory[],
  currentEvent: number
): number | null {
  const current = gameweeks.find((gameweek) => gameweek.event === currentEvent)
  const previous = gameweeks.find(
    (gameweek) => gameweek.event === currentEvent - 1
  )

  if (!current || !previous) {
    return null
  }

  return previous.overall_rank - current.overall_rank
}
