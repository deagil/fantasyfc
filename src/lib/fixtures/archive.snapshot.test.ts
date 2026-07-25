import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { getAwardedBonus, getBpsTable, getMatchEvents } from "@/lib/fixtures/events"
import { getFixturePhase } from "@/lib/fixtures/form"
import { getEventFixtures, groupFixturesByDay } from "@/lib/fixtures/group"
import {
  getFixturePointsByElement,
  isBonusAddedForEvent,
} from "@/lib/fixtures/live"
import type {
  FplElement,
  FplEventLive,
  FplEventStatus,
  FplFixture,
} from "@/lib/fpl/types"

const archiveDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../data/fpl-api/2025-26"
)

function readJson<T>(name: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(archiveDir, name), "utf8")
  ) as T
}

describe("archive snapshot: GW37 fixtures + live", () => {
  const fixtures = readJson<FplFixture[]>("fixtures-gw37.json")
  const live = readJson<FplEventLive>("event-37-live.json")
  const status = readJson<FplEventStatus>("event-status.json")

  it("groups finished GW37 fixtures by day", () => {
    const eventFixtures = getEventFixtures(fixtures, 37)
    expect(eventFixtures.length).toBeGreaterThan(0)
    expect(eventFixtures.every((fixture) => fixture.finished)).toBe(true)

    const groups = groupFixturesByDay(eventFixtures)
    expect(groups.length).toBeGreaterThan(0)
    expect(groups.every((group) => group.fixtures.length > 0)).toBe(true)
  })

  it("extracts match events and BPS from fixture.stats", () => {
    const fixture = fixtures.find((entry) => (entry.stats?.length ?? 0) > 0)
    expect(fixture).toBeDefined()

    const elementsById = new Map<number, FplElement>()
    const events = getMatchEvents(fixture!, elementsById)
    expect(events.some((section) => section.identifier === "goals_scored")).toBe(
      true
    )

    const bps = getBpsTable(fixture!, elementsById, 10)
    expect(bps.length).toBeGreaterThan(0)
    expect(bps[0]!.bps).toBeGreaterThanOrEqual(bps.at(-1)!.bps)

    const bonus = getAwardedBonus(fixture!, elementsById)
    expect(bonus.length).toBeGreaterThan(0)
  })

  it("attributes live explain points to a specific fixture", () => {
    const fixture = fixtures[0]!
    const points = getFixturePointsByElement(live, fixture.id)
    for (const entry of points.values()) {
      expect(entry.element).toBeGreaterThan(0)
      expect(entry.stats.every((stat) => typeof stat.points === "number")).toBe(
        true
      )
    }

    expect(getFixturePhase(fixture)).toBe("finished")
  })

  it("reads bonus_added from event-status for GW37", () => {
    expect(isBonusAddedForEvent(status.status, 37)).toBe(true)
  })
})
