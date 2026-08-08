import type { FplFixture, FplTeam } from "@/lib/fpl/types"

export type UpcomingFixture = {
  fixtureId: number
  event: number
  opponentId: number
  opponentShort: string
  isHome: boolean
  /** FPL fixture difficulty rating from this team's perspective, 1 (easy) to 5. */
  difficulty: number
}

export type FixtureRun = {
  /** One entry per gameweek in the window, in event order. */
  events: FixtureRunEvent[]
  /** Mean difficulty across every fixture in the window; null when all blank. */
  averageDifficulty: number | null
  fixtureCount: number
  blankCount: number
  doubleCount: number
}

export type FixtureRunEvent = {
  event: number
  fixtures: UpcomingFixture[]
}

export type FixtureDifficultyLabel =
  | "favourite"
  | "easier"
  | "average"
  | "harder"
  | "tough"

/**
 * Label a single FDR (1–5) from that side's perspective.
 * Extremes get stronger wording than the near-neutral 2 / 4 band.
 *
 * FDR is not a zero-sum match score: each value is "how hard is this
 * opponent for this team's FPL assets", derived from the opponent's
 * strength and home/away form. So 2 vs 5 and 4 vs 4 are both valid.
 */
export function describeFixtureDifficulty(
  difficulty: number
): FixtureDifficultyLabel {
  const clamped = Math.min(5, Math.max(1, Math.round(difficulty)))
  switch (clamped) {
    case 1:
      return "favourite"
    case 2:
      return "easier"
    case 3:
      return "average"
    case 4:
      return "harder"
    case 5:
      return "tough"
    default: {
      const _exhaustive: never = clamped as never
      return _exhaustive
    }
  }
}

export type MatchAssetOutlookId =
  | "home_favoured"
  | "away_favoured"
  | "both_open"
  | "both_tough"
  | "competitive"

export type MatchAssetOutlook = {
  id: MatchAssetOutlookId
  /** Concise match reading for someone skimming the fixture. */
  label: string
}

export type MatchAssetOutlookTeams = {
  homeName: string
  awayName: string
}

/**
 * Turn a home/away FDR pair into a plain-language match preview.
 *
 * Lower FDR = easier opponent for that side = they are the stronger side in
 * FPL terms. We compare the gap (not whether both hit absolute buckets), so
 * Average vs Tough correctly reads as the average side being favoured.
 */
export function describeMatchAssetOutlook(
  homeDifficulty: number,
  awayDifficulty: number,
  teams: MatchAssetOutlookTeams
): MatchAssetOutlook {
  const home = Math.min(5, Math.max(1, Math.round(homeDifficulty)))
  const away = Math.min(5, Math.max(1, Math.round(awayDifficulty)))
  // Positive gap => home faces the easier opponent => home are preferred.
  const gap = away - home

  if (home <= 2 && away <= 2) {
    return { id: "both_open", label: "Could be open" }
  }
  if (home >= 4 && away >= 4) {
    return { id: "both_tough", label: "Cagey affair" }
  }
  if (gap >= 3) {
    return { id: "home_favoured", label: `Big advantage ${teams.homeName}` }
  }
  if (gap <= -3) {
    return { id: "away_favoured", label: `Big advantage ${teams.awayName}` }
  }
  if (gap >= 2) {
    return { id: "home_favoured", label: `Advantage ${teams.homeName}` }
  }
  if (gap <= -2) {
    return { id: "away_favoured", label: `Advantage ${teams.awayName}` }
  }
  return { id: "competitive", label: "Anyone's game" }
}

export type FixtureRunDifficultyLabel = "easier" | "average" | "harder"

/**
 * Summarise a fixture run relative to a neutral FDR of 3: below is easier,
 * above is harder. Averages are continuous, so extremes are not discrete.
 */
export function describeFixtureRunDifficulty(
  averageDifficulty: number
): FixtureRunDifficultyLabel {
  if (averageDifficulty < 3) {
    return "easier"
  }
  if (averageDifficulty > 3) {
    return "harder"
  }
  return "average"
}

function toUpcomingFixture(
  fixture: FplFixture,
  teamId: number,
  teamsById: Map<number, FplTeam>
): UpcomingFixture {
  const isHome = fixture.team_h === teamId
  const opponentId = isHome ? fixture.team_a : fixture.team_h

  return {
    fixtureId: fixture.id,
    event: fixture.event,
    opponentId,
    opponentShort: teamsById.get(opponentId)?.short_name ?? "—",
    isHome,
    difficulty: isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty,
  }
}

/**
 * A team's fixtures across the next `eventCount` gameweeks starting at
 * `fromEvent`. Iterating gameweeks rather than fixtures means blanks show up as
 * empty entries and doubles as two, which is what makes a run readable.
 */
export function getUpcomingTeamFixtures(
  teamId: number,
  fixtures: readonly FplFixture[],
  teamsById: Map<number, FplTeam>,
  { fromEvent, eventCount }: { fromEvent: number; eventCount: number }
): FixtureRun {
  const events: FixtureRunEvent[] = []
  let difficultySum = 0
  let fixtureCount = 0
  let blankCount = 0
  let doubleCount = 0

  for (let event = fromEvent; event < fromEvent + eventCount; event += 1) {
    const eventFixtures = fixtures
      .filter(
        (fixture) =>
          fixture.event === event &&
          (fixture.team_h === teamId || fixture.team_a === teamId)
      )
      .map((fixture) => toUpcomingFixture(fixture, teamId, teamsById))
      .sort((left, right) => left.fixtureId - right.fixtureId)

    for (const fixture of eventFixtures) {
      difficultySum += fixture.difficulty
      fixtureCount += 1
    }

    if (eventFixtures.length === 0) {
      blankCount += 1
    } else if (eventFixtures.length > 1) {
      doubleCount += 1
    }

    events.push({ event, fixtures: eventFixtures })
  }

  return {
    events,
    averageDifficulty: fixtureCount > 0 ? difficultySum / fixtureCount : null,
    fixtureCount,
    blankCount,
    doubleCount,
  }
}

/** The first gameweek whose fixtures have not all finished. */
export function getNextUnfinishedEvent(
  fixtures: readonly FplFixture[]
): number | null {
  let next: number | null = null

  for (const fixture of fixtures) {
    if (fixture.finished) {
      continue
    }
    if (next === null || fixture.event < next) {
      next = fixture.event
    }
  }

  return next
}
