import type {
  FplBootstrap,
  FplEntryHistory,
  FplLeagueStanding,
  LeagueRankHistory,
  LeagueRankHistorySeries,
} from "@/lib/fpl/types"

export const LEAGUE_RANK_HISTORY_WEEKS = 8
export const LEAGUE_RANK_HISTORY_TOP = 20

export type { LeagueRankHistory, LeagueRankHistorySeries }

export function getRecentFinishedGameweeks(
  bootstrap: FplBootstrap,
  count = LEAGUE_RANK_HISTORY_WEEKS
): number[] {
  const finished = bootstrap.events
    .filter((event) => event.finished)
    .map((event) => event.id)

  return finished.slice(-count)
}

export function getLeaguePointsAtGameweek(
  history: FplEntryHistory,
  gameweek: number,
  startEvent: number
): number | null {
  let total = 0
  let hasPoints = false

  for (const row of history.current) {
    if (row.event < startEvent || row.event > gameweek) {
      continue
    }

    total += row.points
    hasPoints = true
  }

  return hasPoints ? total : null
}

export function assignOrdinalRanks(
  entries: ReadonlyArray<{ entry: number; total: number }>
): Map<number, number> {
  const sorted = [...entries].sort((left, right) => {
    if (right.total !== left.total) {
      return right.total - left.total
    }

    return left.entry - right.entry
  })

  const ranks = new Map<number, number>()

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index]
    ranks.set(current.entry, index + 1)
  }

  return ranks
}

export function buildLeagueRankHistory({
  standings,
  historiesByEntry,
  gameweeks,
  currentTeamId,
  startEvent = 1,
  topCount = LEAGUE_RANK_HISTORY_TOP,
}: {
  standings: FplLeagueStanding[]
  historiesByEntry: Map<number, FplEntryHistory>
  gameweeks: number[]
  currentTeamId: number | null
  startEvent?: number
  topCount?: number
}): LeagueRankHistory {
  const lastEvent = gameweeks.at(-1)
  const weeklyRanks = new Map<number, Map<number, number>>()
  const trackedEntries = new Set<number>()

  for (const event of gameweeks) {
    let ranks: Map<number, number>

    if (event === lastEvent) {
      ranks = new Map(
        standings.map((standing, index) => [
          standing.entry,
          index + 1,
        ])
      )
    } else {
      const totals: Array<{ entry: number; total: number }> = []

      for (const standing of standings) {
        const history = historiesByEntry.get(standing.entry)
        if (!history) {
          continue
        }

        let total = getLeaguePointsAtGameweek(history, event, startEvent)
        if (total === null) {
          for (
            let priorEvent = event - 1;
            priorEvent >= startEvent;
            priorEvent -= 1
          ) {
            total = getLeaguePointsAtGameweek(history, priorEvent, startEvent)
            if (total !== null) {
              break
            }
          }
        }

        if (total === null) {
          continue
        }

        totals.push({ entry: standing.entry, total })
      }

      if (totals.length === 0) {
        continue
      }

      ranks = assignOrdinalRanks(totals)
    }

    weeklyRanks.set(event, ranks)

    for (const [entry, rank] of ranks) {
      if (rank <= topCount) {
        trackedEntries.add(entry)
      }
    }
  }

  const trackedTeams = standings.filter((standing) =>
    trackedEntries.has(standing.entry)
  )

  const series: LeagueRankHistorySeries[] = trackedTeams.map((standing) => ({
    entry: standing.entry,
    name: standing.entry_name,
    isCurrentTeam: standing.entry === currentTeamId,
    points: gameweeks.map((event) => ({
      event,
      rank: weeklyRanks.get(event)?.get(standing.entry) ?? topCount + 1,
    })),
  }))

  return {
    gameweeks,
    teams: trackedTeams.map((standing) => ({
      entry: standing.entry,
      name: standing.entry_name,
      isCurrentTeam: standing.entry === currentTeamId,
    })),
    series,
  }
}

export function getChartAxisPositions(history: LeagueRankHistory): number {
  return Math.min(LEAGUE_RANK_HISTORY_TOP, Math.max(history.teams.length, 1))
}
