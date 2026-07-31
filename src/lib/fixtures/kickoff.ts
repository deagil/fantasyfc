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
