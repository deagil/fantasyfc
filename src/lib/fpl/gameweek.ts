import type { FplEvent, FplFixture, FplTeam } from "@/lib/fpl/types"

export type GameweekFixtureStatus = "upcoming" | "live" | "finished"

export type GameweekTodayFixture = {
  id: number
  homeShort: string
  awayShort: string
  homeScore: number | null
  awayScore: number | null
  status: GameweekFixtureStatus
  kickoffLabel: string | null
  minutes: number | null
}

export type GameweekPhase =
  | { type: "off-season"; event: FplEvent }
  | { type: "countdown"; event: FplEvent; deadline: Date }
  | { type: "locked"; event: FplEvent; firstKickoff: Date }
  | { type: "live"; event: FplEvent; todayFixtures: GameweekTodayFixture[] }
  | { type: "post-gameweek"; event: FplEvent }

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function daysBetween(from: Date, to: Date): number {
  const fromDay = startOfDay(from).getTime()
  const toDay = startOfDay(to).getTime()
  return Math.round((toDay - fromDay) / (24 * 60 * 60 * 1000))
}

function getEventFixtures(fixtures: FplFixture[], eventId: number): FplFixture[] {
  return fixtures.filter(
    (fixture) => fixture.event === eventId && fixture.kickoff_time !== null
  )
}

function getFirstKickoff(fixtures: FplFixture[]): Date | null {
  const kickoffs = fixtures
    .map((fixture) => fixture.kickoff_time)
    .filter((kickoff): kickoff is string => kickoff !== null)
    .map((kickoff) => new Date(kickoff))

  if (kickoffs.length === 0) {
    return null
  }

  return new Date(Math.min(...kickoffs.map((kickoff) => kickoff.getTime())))
}

function getLastFixtureDay(fixtures: FplFixture[]): Date | null {
  const kickoffs = fixtures
    .map((fixture) => fixture.kickoff_time)
    .filter((kickoff): kickoff is string => kickoff !== null)
    .map((kickoff) => new Date(kickoff))

  if (kickoffs.length === 0) {
    return null
  }

  return startOfDay(
    new Date(Math.max(...kickoffs.map((kickoff) => kickoff.getTime())))
  )
}

function findCurrentEvent(events: FplEvent[]): FplEvent | null {
  return events.find((event) => event.is_current) ?? null
}

function findNextEvent(events: FplEvent[]): FplEvent | null {
  return events.find((event) => event.is_next) ?? null
}

function findLastEvent(events: FplEvent[]): FplEvent {
  return events[events.length - 1]
}

export function isSeasonComplete(events: FplEvent[]): boolean {
  const lastEvent = findLastEvent(events)
  return lastEvent.finished && !events.some((event) => event.is_next)
}

function getFixtureStatus(fixture: FplFixture): GameweekFixtureStatus {
  if (fixture.finished) {
    return "finished"
  }

  if (fixture.started) {
    return "live"
  }

  return "upcoming"
}

function formatKickoffLabel(kickoff: Date): string {
  return kickoff.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function getTodayFixtures(
  now: Date,
  fixtures: FplFixture[],
  teamsById: Map<number, FplTeam>
): GameweekTodayFixture[] {
  const today = startOfDay(now)

  return fixtures
    .filter((fixture) => {
      if (!fixture.kickoff_time) {
        return false
      }

      return startOfDay(new Date(fixture.kickoff_time)).getTime() === today.getTime()
    })
    .sort((left, right) => {
      const leftTime = new Date(left.kickoff_time!).getTime()
      const rightTime = new Date(right.kickoff_time!).getTime()
      return leftTime - rightTime
    })
    .map((fixture) => {
      const homeTeam = teamsById.get(fixture.team_h)
      const awayTeam = teamsById.get(fixture.team_a)
      const kickoff = fixture.kickoff_time ? new Date(fixture.kickoff_time) : null

      return {
        id: fixture.id,
        homeShort: homeTeam?.short_name ?? "???",
        awayShort: awayTeam?.short_name ?? "???",
        homeScore: fixture.team_h_score,
        awayScore: fixture.team_a_score,
        status: getFixtureStatus(fixture),
        kickoffLabel: kickoff ? formatKickoffLabel(kickoff) : null,
        minutes: fixture.started && !fixture.finished ? fixture.minutes : null,
      }
    })
}

export function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) {
    return "0m"
  }

  const totalMinutes = Math.floor(remainingMs / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

export function formatDeadlineLabel(deadline: Date): string {
  return deadline.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

function resolveFinishedGameweekPhase(
  now: Date,
  finishedEvent: FplEvent,
  nextEvent: FplEvent | null,
  fixtures: FplFixture[]
): GameweekPhase {
  const lastFixtureDay = getLastFixtureDay(getEventFixtures(fixtures, finishedEvent.id))

  if (lastFixtureDay && daysBetween(lastFixtureDay, now) === 1) {
    return { type: "post-gameweek", event: finishedEvent }
  }

  if (nextEvent) {
    const deadline = new Date(nextEvent.deadline_time)
    return { type: "countdown", event: nextEvent, deadline }
  }

  return { type: "off-season", event: finishedEvent }
}

function resolveActiveGameweekPhase(
  now: Date,
  event: FplEvent,
  fixtures: FplFixture[],
  teamsById: Map<number, FplTeam>
): GameweekPhase {
  const eventFixtures = getEventFixtures(fixtures, event.id)
  const deadline = new Date(event.deadline_time)
  const firstKickoff = getFirstKickoff(eventFixtures)

  if (now < deadline) {
    return { type: "countdown", event, deadline }
  }

  if (firstKickoff && now < firstKickoff) {
    return { type: "locked", event, firstKickoff }
  }

  return {
    type: "live",
    event,
    todayFixtures: getTodayFixtures(now, eventFixtures, teamsById),
  }
}

export function resolveGameweekPhase(
  now: Date,
  events: FplEvent[],
  fixtures: FplFixture[],
  teamsById: Map<number, FplTeam>
): GameweekPhase {
  if (events.length === 0) {
    throw new Error("FPL events are required to resolve gameweek phase")
  }

  if (isSeasonComplete(events)) {
    return { type: "off-season", event: findLastEvent(events) }
  }

  const currentEvent = findCurrentEvent(events)
  const nextEvent = findNextEvent(events)

  if (currentEvent && !currentEvent.finished) {
    return resolveActiveGameweekPhase(now, currentEvent, fixtures, teamsById)
  }

  if (currentEvent?.finished) {
    return resolveFinishedGameweekPhase(now, currentEvent, nextEvent, fixtures)
  }

  if (nextEvent) {
    return resolveActiveGameweekPhase(now, nextEvent, fixtures, teamsById)
  }

  return { type: "off-season", event: findLastEvent(events) }
}

export function getPhaseSubtitle(phase: GameweekPhase): string {
  switch (phase.type) {
    case "off-season":
      return "Postseason"
    case "countdown":
      return `Gameweek ${phase.event.id} · ${formatDeadlineLabel(phase.deadline)}`
    case "locked":
      return `Gameweek ${phase.event.id} · Squad locked`
    case "live":
      return `Gameweek ${phase.event.id} · Live`
    case "post-gameweek":
      return `Gameweek ${phase.event.id} · Final`
    default: {
      const exhaustiveCheck: never = phase
      return exhaustiveCheck
    }
  }
}
