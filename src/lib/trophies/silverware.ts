import type { FplClassicLeague, FplLeagueStanding } from "@/lib/fpl/types"
import type { TrophyMedal } from "@/lib/trophies/types"
import { marginToNext, medalForRank } from "@/lib/trophies/season"

export type SilverwareTitle = {
  leagueId: number
  leagueName: string
  rank: 1 | 2 | 3
  medal: TrophyMedal
  leagueSize: number
}

/** Live podium stats that need standings (not on the entry leagues payload). */
export type SilverwarePodiumStats = {
  entryId: number
  entryName: string
  playerName: string
  points: number
  margin: number
}

/** Live podium finishes from the entry payload (placeholder until banked rows exist). */
export function getSilverwareTitles(
  leagues: FplClassicLeague[]
): SilverwareTitle[] {
  return leagues
    .filter(
      (league): league is FplClassicLeague & { entry_rank: 1 | 2 | 3 } =>
        league.entry_rank === 1 ||
        league.entry_rank === 2 ||
        league.entry_rank === 3
    )
    .map((league) => ({
      leagueId: league.id,
      leagueName: league.name,
      rank: league.entry_rank,
      medal: medalForRank(league.entry_rank),
      leagueSize: league.rank_count,
    }))
    .sort((a, b) => a.rank - b.rank || a.leagueName.localeCompare(b.leagueName))
}

export function medalOrdinal(medal: TrophyMedal): string {
  switch (medal) {
    case "gold":
      return "1st"
    case "silver":
      return "2nd"
    case "bronze":
      return "3rd"
    default: {
      const _exhaustive: never = medal
      return _exhaustive
    }
  }
}

export function findSilverwareTitle(
  leagues: FplClassicLeague[],
  leagueId: number
): SilverwareTitle | undefined {
  return getSilverwareTitles(leagues).find((title) => title.leagueId === leagueId)
}

/**
 * Points + margin for a podium rank from standings.
 * Same math as banking (`marginToNext`) — live path just never had standings before.
 */
export function podiumStatsFromStandings(
  standings: FplLeagueStanding[],
  rank: 1 | 2 | 3
): SilverwarePodiumStats | undefined {
  const standing = standings.find((row) => row.rank === rank)
  if (!standing) {
    return undefined
  }

  const nextStanding = standings.find((row) => row.rank === rank + 1)

  return {
    entryId: standing.entry,
    entryName: standing.entry_name,
    playerName: standing.player_name,
    points: standing.total,
    margin: marginToNext(standing.total, nextStanding?.total),
  }
}

export function awardHeadline(title: SilverwareTitle): string {
  return `${medalOrdinal(title.medal)} place`
}

export type AwardDescriptionOptions = {
  season?: string
  /** Team that holds the award (from standings / banked row). */
  entryName?: string
  /** True when the viewer’s connected team is the award holder. */
  viewerOwnsAward?: boolean
  points?: number
  margin?: number
}

/** Apple Watch–style award body copy. Adaptive for own vs other team. */
export function awardDescription(
  title: SilverwareTitle,
  options: AwardDescriptionOptions = {}
): string {
  const season = options.season ?? "25/26"
  const ordinal = medalOrdinal(title.medal)
  const managers =
    title.leagueSize > 0
      ? `${title.leagueSize} managers competed`
      : "Managers competed"

  const owns = options.viewerOwnsAward ?? false
  const entryName = options.entryName

  const finishClause = owns
    ? `You earned this award when you finished ${ordinal} in ${title.leagueName}`
    : entryName
      ? `${entryName} earned this award by finishing ${ordinal} in ${title.leagueName}`
      : `This award was earned by finishing ${ordinal} in ${title.leagueName}`

  const marginClause =
    options.margin !== undefined && options.points !== undefined
      ? ` on ${options.points} points, ${options.margin} ahead of the next place`
      : options.points !== undefined
        ? ` on ${options.points} points`
        : ""

  return `${finishClause}${marginClause} during the ${season} season. ${managers} in this classic league.`
}
