const MAX_FPL_ID = 999_999_999

function parsePositiveInt(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_FPL_ID) {
    throw new Error(`Invalid ${field}`)
  }

  return parsed
}

export function parseTeamId(value: unknown): number {
  return parsePositiveInt(value, "teamId")
}

export function parseEventId(value: unknown): number {
  return parsePositiveInt(value, "event")
}

export function parseOptionalEventId(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  return parsePositiveInt(value, "event")
}

export function parseLeagueId(value: unknown): number {
  return parsePositiveInt(value, "leagueId")
}

export function parseStandingsPage(value: unknown): number {
  if (value === undefined || value === null) {
    return 1
  }

  return parsePositiveInt(value, "page")
}

export function parseWeeksCount(value: unknown): number {
  if (value === undefined || value === null) {
    return 8
  }

  const parsed = typeof value === "number" ? value : Number(value)

  if (!Number.isInteger(parsed) || parsed < 2 || parsed > 20) {
    throw new Error("Invalid weeks")
  }

  return parsed
}
