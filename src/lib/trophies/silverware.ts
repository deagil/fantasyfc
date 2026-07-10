import type { FplClassicLeague } from "@/lib/fpl/types"
import type { TrophyMedal } from "@/lib/trophies/types"
import { medalForRank } from "@/lib/trophies/season"

export type SilverwareTitle = {
  leagueId: number
  leagueName: string
  rank: 1 | 2 | 3
  medal: TrophyMedal
  leagueSize: number
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
