import type { FplFixture } from "@/lib/fpl/types"

export type FixtureDayGroup = {
  dateKey: string
  date: Date
  label: string
  fixtures: FplFixture[]
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function compareKickoffs(left: FplFixture, right: FplFixture): number {
  const leftTime = left.kickoff_time
    ? new Date(left.kickoff_time).getTime()
    : Number.POSITIVE_INFINITY
  const rightTime = right.kickoff_time
    ? new Date(right.kickoff_time).getTime()
    : Number.POSITIVE_INFINITY
  return leftTime - rightTime || left.id - right.id
}

export function getEventFixtures(
  fixtures: readonly FplFixture[],
  eventId: number
): FplFixture[] {
  return fixtures
    .filter((fixture) => fixture.event === eventId)
    .sort(compareKickoffs)
}

export function sortFixturesByKickoff(
  fixtures: readonly FplFixture[]
): FplFixture[] {
  return [...fixtures].sort(compareKickoffs)
}

export function groupFixturesByDay(
  fixtures: readonly FplFixture[],
  locale?: string,
  labelStyle: "long" | "short" = "long"
): FixtureDayGroup[] {
  const groups = new Map<string, FixtureDayGroup>()

  for (const fixture of sortFixturesByKickoff(fixtures)) {
    if (!fixture.kickoff_time) {
      const key = "tbd"
      const existing = groups.get(key)
      if (existing) {
        existing.fixtures.push(fixture)
      } else {
        groups.set(key, {
          dateKey: key,
          date: new Date(0),
          label: "Kickoff TBC",
          fixtures: [fixture],
        })
      }
      continue
    }

    const kickoff = new Date(fixture.kickoff_time)
    const day = startOfDay(kickoff)
    const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
    const existing = groups.get(dateKey)

    if (existing) {
      existing.fixtures.push(fixture)
    } else {
      groups.set(dateKey, {
        dateKey,
        date: day,
        label:
          labelStyle === "short"
            ? day.toLocaleDateString(locale, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })
            : day.toLocaleDateString(locale, {
                weekday: "long",
                month: "long",
                day: "numeric",
              }),
        fixtures: [fixture],
      })
    }
  }

  return [...groups.values()].sort((left, right) => {
    if (left.dateKey === "tbd") {
      return 1
    }
    if (right.dateKey === "tbd") {
      return -1
    }
    return left.date.getTime() - right.date.getTime()
  })
}
