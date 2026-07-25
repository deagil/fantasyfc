import { getResolvedColorScheme } from "@/lib/color-scheme"
import type { ResolvedColorScheme } from "@/lib/color-scheme"

export const KICKOFF_THEME_STORAGE_KEY = "deadline-kickoff-theme"
const THEME_CHANGE_EVENT = "deadline-kickoff-theme-change"

export const kickoffThemeIds = ["early-kickoff", "late-kickoff"] as const

export type KickoffThemeId = (typeof kickoffThemeIds)[number]

type KickoffBackdropMap = Record<
  ResolvedColorScheme,
  Record<KickoffThemeId, string>
>

/**
 * Solid fill Safari uses for overscroll / browser chrome letterboxing. Keep in
 * sync with the `--shell-backdrop-color` declarations in `styles.css`.
 */
export const kickoffBackdropColors: KickoffBackdropMap = {
  light: {
    // Mid sky-teal — matches the early gradient (not near-white sky)
    "early-kickoff": "#8ec8e0",
    "late-kickoff": "#5c3d7a",
  },
  dark: {
    "early-kickoff": "#0a2430",
    "late-kickoff": "#1b0d2a",
  },
}

export const kickoffBackdropImages: KickoffBackdropMap = {
  light: {
    "early-kickoff":
      "linear-gradient(to bottom right, color-mix(in oklab, #05f0ff 45%, #e8f2fa), color-mix(in oklab, #00ff85 40%, #dceef8))",
    "late-kickoff":
      "radial-gradient(ellipse 90% 70% at 12% -8%, color-mix(in oklab, #6b3fa0 50%, transparent), transparent 58%), radial-gradient(ellipse 70% 55% at 100% 100%, color-mix(in oklab, #ff2882 15%, transparent), transparent 52%), linear-gradient(155deg, #6b4888 0%, #5c3d7a 42%, #3d195b 100%)",
  },
  dark: {
    "early-kickoff":
      "radial-gradient(ellipse 85% 65% at 8% -10%, color-mix(in oklab, #05f0ff 18%, transparent), transparent 60%), linear-gradient(to bottom right, #0d2c39 0%, #08202a 45%, #041219 100%)",
    "late-kickoff":
      "radial-gradient(ellipse 90% 70% at 12% -8%, color-mix(in oklab, #6b3fa0 42%, transparent), transparent 58%), radial-gradient(ellipse 70% 55% at 100% 100%, color-mix(in oklab, #ff2882 12%, transparent), transparent 52%), linear-gradient(155deg, #2c1544 0%, #1b0d2a 45%, #0b0412 100%)",
  },
}

export const kickoffThemes: {
  id: KickoffThemeId
  label: string
  description: string
}[] = [
  {
    id: "early-kickoff",
    label: "Early Kickoff",
    description: "Sky background, blue hover.",
  },
  {
    id: "late-kickoff",
    label: "Late Kickoff",
    description: "Plum background, pink hover.",
  },
]

export function isKickoffThemeId(value: string): value is KickoffThemeId {
  return (kickoffThemeIds as readonly string[]).includes(value)
}

export function getStoredKickoffTheme(): KickoffThemeId {
  const raw = localStorage.getItem(KICKOFF_THEME_STORAGE_KEY)
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
  localStorage.setItem(KICKOFF_THEME_STORAGE_KEY, theme)
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

/** Apply theme to <html> so Safari overscroll/chrome match the shell. */
export function applyKickoffThemeToDocument(
  theme: KickoffThemeId,
  scheme: ResolvedColorScheme = getResolvedColorScheme()
): void {
  const root = document.documentElement
  root.dataset.kickoffTheme = theme

  const color = kickoffBackdropColors[scheme][theme]
  root.style.setProperty("--shell-backdrop-color", color)
  root.style.setProperty(
    "--shell-backdrop-image",
    kickoffBackdropImages[scheme][theme]
  )

  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement("meta")
    meta.setAttribute("name", "theme-color")
    document.head.appendChild(meta)
  }
  meta.setAttribute("content", color)
}
