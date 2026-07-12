const STORAGE_KEY = "deadline-kickoff-theme"
const THEME_CHANGE_EVENT = "deadline-kickoff-theme-change"

export const kickoffThemeIds = ["early-kickoff", "late-kickoff"] as const

export type KickoffThemeId = (typeof kickoffThemeIds)[number]

export const kickoffThemes: {
  id: KickoffThemeId
  label: string
  description: string
  /** Browser chrome / status bar tint (`theme-color`). */
  themeColor: string
}[] = [
  {
    id: "early-kickoff",
    label: "Early Kickoff",
    description: "Light sky background, white tiles, blue hover.",
    themeColor: "#e8f2fa",
  },
  {
    id: "late-kickoff",
    label: "Late Kickoff",
    description: "Plum background, white tiles, pink hover.",
    themeColor: "#5c3d7a",
  },
]

export function getKickoffThemeColor(theme: KickoffThemeId): string {
  return (
    kickoffThemes.find((entry) => entry.id === theme)?.themeColor ?? "#5c3d7a"
  )
}

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

export function subscribeKickoffTheme(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange()
  window.addEventListener("storage", handler)
  window.addEventListener(THEME_CHANGE_EVENT, handler)
  return () => {
    window.removeEventListener("storage", handler)
    window.removeEventListener(THEME_CHANGE_EVENT, handler)
  }
}

export function setStoredKickoffTheme(theme: KickoffThemeId): void {
  localStorage.setItem(STORAGE_KEY, theme)
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}
