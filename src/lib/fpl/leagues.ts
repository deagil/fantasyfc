import type { FplClassicLeague } from "@/lib/fpl/types"

export type LeagueTabId = "private" | "system"

const excludedSystemShortNamePrefixes = ["team-", "region-", "event-"] as const

export function isLeagueTabId(value: string): value is LeagueTabId {
  return value === "private" || value === "system"
}

function isGlobalSystemLeague(league: FplClassicLeague): boolean {
  if (league.league_type !== "s") {
    return false
  }

  const shortName = league.short_name ?? ""
  return !excludedSystemShortNamePrefixes.some((prefix) =>
    shortName.startsWith(prefix)
  )
}

function getSystemLeagueSortOrder(league: FplClassicLeague): number {
  if (league.short_name === "overall") {
    return 0
  }

  if (league.short_name === "sc") {
    return 1
  }

  return 2
}

export function getPrivateLeagues(
  leagues: FplClassicLeague[]
): FplClassicLeague[] {
  return leagues
    .filter((league) => league.league_type === "x")
    .sort((a, b) => a.rank_count - b.rank_count)
}

/** @deprecated Use getPrivateLeagues */
export function getSubscribedLeagues(
  leagues: FplClassicLeague[]
): FplClassicLeague[] {
  return getPrivateLeagues(leagues)
}

export function getSystemLeagues(
  leagues: FplClassicLeague[]
): FplClassicLeague[] {
  return leagues
    .filter(isGlobalSystemLeague)
    .sort((a, b) => {
      const orderDelta =
        getSystemLeagueSortOrder(a) - getSystemLeagueSortOrder(b)
      if (orderDelta !== 0) {
        return orderDelta
      }

      return a.name.localeCompare(b.name)
    })
}

export function getLeaguesForTab(
  leagues: FplClassicLeague[],
  tab: LeagueTabId
): FplClassicLeague[] {
  switch (tab) {
    case "private":
      return getPrivateLeagues(leagues)
    case "system":
      return getSystemLeagues(leagues)
    default: {
      const _exhaustive: never = tab
      return _exhaustive
    }
  }
}

export function getLeagueRankChange(league: FplClassicLeague): number {
  return league.entry_last_rank - league.entry_rank
}

export function formatLeagueRank(rank: number, rankCount: number): string {
  if (rankCount >= 1_000_000) {
    return `${(rank / 1_000_000).toFixed(1)}M`
  }

  if (rankCount >= 10_000) {
    return rank.toLocaleString()
  }

  return rank.toString()
}
