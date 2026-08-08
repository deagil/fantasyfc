import type { FplFixture, FplTeam } from "@/lib/fpl/types"

export type FormResult = "W" | "D" | "L"

export type TeamFormEntry = {
  fixtureId: number
  opponentId: number
  opponentShort: string
  wasHome: boolean
  result: FormResult
  goalsFor: number
  goalsAgainst: number
}

export type HeadToHeadResult = {
  fixtureId: number
  event: number
  homeTeamId: number
  awayTeamId: number
  homeScore: number
  awayScore: number
  kickoffTime: string | null
}

function resultForSide(
  goalsFor: number,
  goalsAgainst: number
): FormResult {
  if (goalsFor > goalsAgainst) {
    return "W"
  }
  if (goalsFor < goalsAgainst) {
    return "L"
  }
  return "D"
}

export function getTeamRecentForm(
  teamId: number,
  fixtures: readonly FplFixture[],
  teamsById: Map<number, FplTeam>,
  limit = 5
): TeamFormEntry[] {
  const finished = fixtures
    .filter(
      (fixture) =>
        fixture.finished &&
        fixture.team_h_score != null &&
        fixture.team_a_score != null &&
        (fixture.team_h === teamId || fixture.team_a === teamId)
    )
    .sort((left, right) => {
      const leftTime = left.kickoff_time
        ? new Date(left.kickoff_time).getTime()
        : 0
      const rightTime = right.kickoff_time
        ? new Date(right.kickoff_time).getTime()
        : 0
      return rightTime - leftTime
    })
    .slice(0, limit)

  return finished.map((fixture) => {
    const wasHome = fixture.team_h === teamId
    const goalsFor = wasHome ? fixture.team_h_score! : fixture.team_a_score!
    const goalsAgainst = wasHome ? fixture.team_a_score! : fixture.team_h_score!
    const opponentId = wasHome ? fixture.team_a : fixture.team_h

    return {
      fixtureId: fixture.id,
      opponentId,
      opponentShort: teamsById.get(opponentId)?.short_name ?? "???",
      wasHome,
      result: resultForSide(goalsFor, goalsAgainst),
      goalsFor,
      goalsAgainst,
    }
  })
}

/**
 * Oldest → newest form slots for a fixed-width strip. Unplayed slots are
 * null so the UI can render "-" until those games exist.
 */
export function padTeamFormSlots(
  entries: readonly TeamFormEntry[],
  limit = 5
): Array<TeamFormEntry | null> {
  const chronological = [...entries].reverse().slice(-limit)
  const slots: Array<TeamFormEntry | null> = [...chronological]
  while (slots.length < limit) {
    slots.push(null)
  }
  return slots
}

export function getHeadToHead(
  homeTeamId: number,
  awayTeamId: number,
  fixtures: readonly FplFixture[],
  limit = 5
): HeadToHeadResult[] {
  return fixtures
    .filter(
      (fixture) =>
        fixture.finished &&
        fixture.team_h_score != null &&
        fixture.team_a_score != null &&
        ((fixture.team_h === homeTeamId && fixture.team_a === awayTeamId) ||
          (fixture.team_h === awayTeamId && fixture.team_a === homeTeamId))
    )
    .sort((left, right) => {
      const leftTime = left.kickoff_time
        ? new Date(left.kickoff_time).getTime()
        : 0
      const rightTime = right.kickoff_time
        ? new Date(right.kickoff_time).getTime()
        : 0
      return rightTime - leftTime
    })
    .slice(0, limit)
    .map((fixture) => ({
      fixtureId: fixture.id,
      event: fixture.event,
      homeTeamId: fixture.team_h,
      awayTeamId: fixture.team_a,
      homeScore: fixture.team_h_score!,
      awayScore: fixture.team_a_score!,
      kickoffTime: fixture.kickoff_time,
    }))
}

export type FixturePhase = "pre-match" | "live" | "finished"

export type TeamRecord = {
  wins: number
  draws: number
  losses: number
  played: number
}

export function formatTeamRecord(record: TeamRecord): string {
  return `${record.wins}-${record.draws}-${record.losses}`
}

/** Season W-D-L from finished fixtures with scores. */
export function getTeamRecord(
  teamId: number,
  fixtures: readonly FplFixture[]
): TeamRecord {
  let wins = 0
  let draws = 0
  let losses = 0

  for (const fixture of fixtures) {
    if (
      !fixture.finished ||
      fixture.team_h_score == null ||
      fixture.team_a_score == null ||
      (fixture.team_h !== teamId && fixture.team_a !== teamId)
    ) {
      continue
    }

    const wasHome = fixture.team_h === teamId
    const goalsFor = wasHome ? fixture.team_h_score : fixture.team_a_score
    const goalsAgainst = wasHome ? fixture.team_a_score : fixture.team_h_score
    const result = resultForSide(goalsFor, goalsAgainst)

    switch (result) {
      case "W":
        wins += 1
        break
      case "D":
        draws += 1
        break
      case "L":
        losses += 1
        break
      default: {
        const _exhaustive: never = result
        void _exhaustive
      }
    }
  }

  return {
    wins,
    draws,
    losses,
    played: wins + draws + losses,
  }
}

export function getFixturePhase(fixture: FplFixture): FixturePhase {
  if (fixture.finished || fixture.finished_provisional) {
    return "finished"
  }
  if (fixture.started) {
    return "live"
  }
  return "pre-match"
}
