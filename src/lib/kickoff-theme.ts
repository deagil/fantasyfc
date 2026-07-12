const STORAGE_KEY = "deadline-kickoff-theme"
const THEME_CHANGE_EVENT = "deadline-kickoff-theme-change"

export const kickoffThemeIds = ["early-kickoff", "late-kickoff"] as const

export type KickoffThemeId = (typeof kickoffThemeIds)[number]

/** Solid fill Safari uses for overscroll / browser chrome letterboxing. */
export const kickoffBackdropColors: Record<KickoffThemeId, string> = {
  // Mid sky-teal — matches the early gradient and theme-color (not near-white plum)
  "early-kickoff": "#8ec8e0",
  "late-kickoff": "#5c3d7a",
}

export const kickoffBackdropImages: Record<KickoffThemeId, string> = {
  "early-kickoff":
    "linear-gradient(to bottom right, color-mix(in oklab, #05f0ff 45%, #e8f2fa), color-mix(in oklab, #00ff85 40%, #dceef8))",
  "late-kickoff":
    "radial-gradient(ellipse 90% 70% at 12% -8%, color-mix(in oklab, #6b3fa0 50%, transparent), transparent 58%), radial-gradient(ellipse 70% 55% at 100% 100%, color-mix(in oklab, #ff2882 15%, transparent), transparent 52%), linear-gradient(155deg, #6b4888 0%, #5c3d7a 42%, #3d195b 100%)",
}

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
    themeColor: kickoffBackdropColors["early-kickoff"],
  },
  {
    id: "late-kickoff",
    label: "Late Kickoff",
    description: "Plum background, white tiles, pink hover.",
    themeColor: kickoffBackdropColors["late-kickoff"],
  },
]

export function getKickoffThemeColor(theme: KickoffThemeId): string {
  return kickoffBackdropColors[theme]
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

/** Apply theme to <html> so Safari overscroll/chrome match the shell. */
export function applyKickoffThemeToDocument(theme: KickoffThemeId): void {
  const root = document.documentElement
  root.dataset.kickoffTheme = theme
  root.style.setProperty("--shell-backdrop-color", kickoffBackdropColors[theme])
  root.style.setProperty("--shell-backdrop-image", kickoffBackdropImages[theme])

  const color = kickoffBackdropColors[theme]
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement("meta")
    meta.setAttribute("name", "theme-color")
    document.head.appendChild(meta)
  }
  meta.setAttribute("content", color)
}
