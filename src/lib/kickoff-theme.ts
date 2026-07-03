const STORAGE_KEY = "deadline-kickoff-theme"

export const kickoffThemeIds = ["early-kickoff", "late-kickoff"] as const

export type KickoffThemeId = (typeof kickoffThemeIds)[number]

export const kickoffThemes: {
  id: KickoffThemeId
  label: string
  description: string
}[] = [
  {
    id: "early-kickoff",
    label: "Early kickoff",
    description: "Light sky background, white tiles, blue hover.",
  },
  {
    id: "late-kickoff",
    label: "Late kickoff",
    description: "Plum background, white tiles, pink hover.",
  },
]

export function isKickoffThemeId(value: string): value is KickoffThemeId {
  return (kickoffThemeIds as readonly string[]).includes(value)
}

export function getStoredKickoffTheme(): KickoffThemeId {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw && isKickoffThemeId(raw)) {
    return raw
  }

  return "late-kickoff"
}

export function setStoredKickoffTheme(theme: KickoffThemeId): void {
  localStorage.setItem(STORAGE_KEY, theme)
}
