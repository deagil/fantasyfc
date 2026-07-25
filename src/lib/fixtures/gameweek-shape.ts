import type { FplFixture, FplTeam } from "@/lib/fpl/types"

export type GameweekShape = {
  eventId: number
  isBlank: boolean
  isDouble: boolean
  blankTeams: FplTeam[]
  doubleTeams: FplTeam[]
}

/**
 * Detect blank and double gameweeks from fixture counts per team.
 * A blank GW has at least one team with 0 fixtures; a double has at least one
 * team with 2+ fixtures in the same event.
 */
export function getGameweekShape(
  eventId: number,
  fixtures: readonly FplFixture[],
  teams: readonly FplTeam[]
): GameweekShape {
  const eventFixtures = fixtures.filter((fixture) => fixture.event === eventId)
  const counts = new Map<number, number>()

  for (const team of teams) {
    counts.set(team.id, 0)
  }

  for (const fixture of eventFixtures) {
    counts.set(fixture.team_h, (counts.get(fixture.team_h) ?? 0) + 1)
    counts.set(fixture.team_a, (counts.get(fixture.team_a) ?? 0) + 1)
  }

  const blankTeams: FplTeam[] = []
  const doubleTeams: FplTeam[] = []

  for (const team of teams) {
    const count = counts.get(team.id) ?? 0
    if (count === 0) {
      blankTeams.push(team)
    } else if (count >= 2) {
      doubleTeams.push(team)
    }
  }

  return {
    eventId,
    isBlank: blankTeams.length > 0,
    isDouble: doubleTeams.length > 0,
    blankTeams,
    doubleTeams,
  }
}

export function getGameweekShapes(
  eventIds: readonly number[],
  fixtures: readonly FplFixture[],
  teams: readonly FplTeam[]
): Map<number, GameweekShape> {
  const shapes = new Map<number, GameweekShape>()
  for (const eventId of eventIds) {
    shapes.set(eventId, getGameweekShape(eventId, fixtures, teams))
  }
  return shapes
}
