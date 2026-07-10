export type TrophyMedal = "gold" | "silver" | "bronze"

export type LeagueTrophy = {
  id: string
  league_id: number
  season: string
  rank: 1 | 2 | 3
  medal: TrophyMedal
  league_name: string
  league_size: number
  entry_id: number
  entry_name: string
  player_name: string
  points: number
  margin: number
  banked_at: string
}

export type EntryClaim = {
  id: string
  user_id: string
  season: string
  fpl_entry_id: number
  entry_name: string
  player_name: string
  claimed_at: string
}

export type ClaimPreview = {
  season: string
  fplEntryId: number
  entryName: string
  playerName: string
}

export type ClaimResult =
  | { status: "claimed"; claim: EntryClaim }
  | { status: "already_claimed"; season: string; fplEntryId: number }
  | { status: "already_linked"; claim: EntryClaim }

export type BankLeagueTrophiesResult = {
  season: string | null
  seasonComplete: boolean
  leaguesChecked: number
  leaguesBanked: number
  trophiesInserted: number
}
