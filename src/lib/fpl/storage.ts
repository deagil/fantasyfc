const STORAGE_KEY = "deadline-team-id"

export function getStoredTeamId(): number | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  const teamId = Number.parseInt(raw, 10)
  if (!Number.isFinite(teamId) || teamId <= 0) {
    return null
  }

  return teamId
}

export function setStoredTeamId(teamId: number | null): void {
  if (teamId === null) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }

  localStorage.setItem(STORAGE_KEY, String(teamId))
}
