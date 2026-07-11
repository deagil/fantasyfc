export type FplLeaguePhase = {
  phase: number
  rank: number
  last_rank: number
  rank_sort: number
  total: number
  league_id: number
  rank_count: number
  entry_percentile_rank: number
}

export type FplClassicLeague = {
  id: number
  name: string
  short_name: string | null
  league_type: "s" | "x"
  rank_count: number
  entry_rank: number
  entry_last_rank: number
  active_phases: FplLeaguePhase[]
}

export type FplEntryLeagues = {
  classic: FplClassicLeague[]
}

export type FplLeagueStanding = {
  id: number
  event_total: number
  player_name: string
  rank: number
  last_rank: number
  rank_sort: number
  total: number
  entry: number
  entry_name: string
  has_played: boolean
}

export type FplLeagueStandings = {
  league: {
    id: number
    name: string
    start_event: number
  }
  standings: {
    has_next: boolean
    page: number
    results: FplLeagueStanding[]
  }
}

export type FplEntry = {
  id: number
  name: string
  player_first_name: string
  player_last_name: string
  summary_event_points: number
  summary_overall_points: number
  summary_event_rank: number
  summary_overall_rank: number
  current_event: number
  last_deadline_bank: number
  last_deadline_value: number
  leagues: FplEntryLeagues
}

export type FplGameweekHistory = {
  event: number
  points: number
  total_points: number
  rank: number
  overall_rank: number
  points_on_bench: number
  bank: number
  value: number
  event_transfers: number
  event_transfers_cost: number
}

export type FplEntryHistory = {
  current: FplGameweekHistory[]
}

export type FplEvent = {
  id: number
  name: string
  deadline_time: string
  finished: boolean
  is_current: boolean
  is_next: boolean
  data_checked: boolean
  average_entry_score: number
}

export type FplTeam = {
  id: number
  name: string
  short_name: string
}

export type FplElementTypeId = 1 | 2 | 3 | 4

export type FplElementStatus = "a" | "d" | "i" | "n" | "s" | "u"

export type FplElement = {
  id: number
  web_name: string
  team: number
  element_type: FplElementTypeId
  now_cost: number
  form: string
  total_points: number
  bonus: number
  defensive_contribution: number
  goals_scored: number
  assists: number
  minutes: number
  starts: number
  selected_by_percent: string
  status: FplElementStatus
}

export type FplPick = {
  element: number
  position: number
  multiplier: number
  is_captain: boolean
  is_vice_captain: boolean
  element_type: number
}

export type FplEntryPicks = {
  picks: FplPick[]
}

export type FplEventLiveElement = {
  id: number
  stats: {
    total_points: number
  }
}

export type FplEventLive = {
  elements: FplEventLiveElement[]
}

export type FplBootstrap = {
  events: FplEvent[]
  teams: FplTeam[]
  elements: FplElement[]
}

export type LeagueRankHistoryPoint = {
  event: number
  rank: number
}

export type LeagueRankHistorySeries = {
  entry: number
  name: string
  isCurrentTeam: boolean
  points: LeagueRankHistoryPoint[]
}

export type LeagueRankHistory = {
  gameweeks: number[]
  teams: Array<{
    entry: number
    name: string
    isCurrentTeam: boolean
  }>
  series: LeagueRankHistorySeries[]
}

export type FplFixture = {
  id: number
  event: number
  team_h: number
  team_a: number
  team_h_score: number | null
  team_a_score: number | null
  kickoff_time: string | null
  finished: boolean
  started: boolean
  minutes: number
}
