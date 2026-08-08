import { getFixturePhase } from "@/lib/fixtures/form"
import type { FplFixture } from "@/lib/fpl/types"

export function formatFixtureKickoff(
  kickoff: string | null,
  options?: {
    includeWeekday?: boolean
    locale?: string
  }
): string {
  if (!kickoff) {
    return "TBC"
  }

  const date = new Date(kickoff)
  const time = date.toLocaleTimeString(options?.locale, {
    hour: "numeric",
    minute: "2-digit",
  })

  if (!options?.includeWeekday) {
    return time
  }

  const weekday = date.toLocaleDateString(options?.locale, {
    weekday: "short",
  })

  return `${weekday} ${time}`
}

/** Pre-match sheet/page title: "Sat 22 Aug at 12:30". */
export function formatMatchKickoffTitle(
  kickoff: string | null,
  locale?: string
): string {
  if (!kickoff) {
    return "Kickoff TBC"
  }

  const date = new Date(kickoff)
  const dayPart = date.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
  const timePart = date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  })
  return `${dayPart} at ${timePart}`
}

/** Drawer chrome title: kickoff for pre-match, live/FT once the game starts. */
export function formatMatchSheetTitle(fixture: FplFixture): string {
  const phase = getFixturePhase(fixture)
  switch (phase) {
    case "live":
      return fixture.minutes > 0 ? `Live ${fixture.minutes}'` : "Live"
    case "finished":
      return "Full time"
    case "pre-match":
      return formatMatchKickoffTitle(fixture.kickoff_time)
    default: {
      const _exhaustive: never = phase
      return _exhaustive
    }
  }
}
