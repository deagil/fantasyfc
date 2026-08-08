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
  | "even"

export type MatchAssetOutlook = {
  id: MatchAssetOutlookId
  /** Short reading of the pair for FPL asset selection. */
  label: string
}

/**
 * Interpret a home/away FDR pair. Because each rating is opponent-relative,
 * the useful question is who (if anyone) gets the favourable asset game —
 * not whether the two numbers "add up".
 */
export function describeMatchAssetOutlook(
  homeDifficulty: number,
  awayDifficulty: number
): MatchAssetOutlook {
  const home = Math.min(5, Math.max(1, Math.round(homeDifficulty)))
  const away = Math.min(5, Math.max(1, Math.round(awayDifficulty)))
  const homeEasy = home <= 2
  const awayEasy = away <= 2
  const homeHard = home >= 4
  const awayHard = away >= 4

  if (homeEasy && awayHard) {
    return { id: "home_favoured", label: "Home assets favoured" }
  }
  if (awayEasy && homeHard) {
    return { id: "away_favoured", label: "Away assets favoured" }
  }
  if (homeEasy && awayEasy) {
    return { id: "both_open", label: "Open for both sides" }
  }
  if (homeHard && awayHard) {
    return { id: "both_tough", label: "Tough for both sides" }
  }
  return { id: "even", label: "Even outlook" }
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
