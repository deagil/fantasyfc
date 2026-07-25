export const COLOR_SCHEME_STORAGE_KEY = "deadline-color-scheme"
const CHANGE_EVENT = "deadline-color-scheme-change"
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)"

export const colorSchemePreferences = ["system", "light", "dark"] as const

/** What the user picked. `system` follows `prefers-color-scheme`. */
export type ColorSchemePreference = (typeof colorSchemePreferences)[number]

/** What actually gets painted after resolving `system`. */
export type ResolvedColorScheme = "light" | "dark"

export const defaultColorSchemePreference: ColorSchemePreference = "system"

/** SSR renders light; the boot script corrects before first paint. */
export const defaultResolvedColorScheme: ResolvedColorScheme = "light"

export const colorSchemeOptions: {
  id: ColorSchemePreference
  label: string
}[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
]

export function isColorSchemePreference(
  value: string
): value is ColorSchemePreference {
  return (colorSchemePreferences as readonly string[]).includes(value)
}

export function getStoredColorSchemePreference(): ColorSchemePreference {
  const raw = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)
  if (raw && isColorSchemePreference(raw)) {
    return raw
  }

  return defaultColorSchemePreference
}

export function setStoredColorSchemePreference(
  preference: ColorSchemePreference
): void {
  localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, preference)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function getSystemColorScheme(): ResolvedColorScheme {
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light"
}

export function resolveColorScheme(
  preference: ColorSchemePreference
): ResolvedColorScheme {
  switch (preference) {
    case "light":
      return "light"
    case "dark":
      return "dark"
    case "system":
      return getSystemColorScheme()
    default: {
      const exhaustive: never = preference
      return exhaustive
    }
  }
}

export function getResolvedColorScheme(): ResolvedColorScheme {
  return resolveColorScheme(getStoredColorSchemePreference())
}

export function subscribeColorScheme(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange()
  const media = window.matchMedia(DARK_MEDIA_QUERY)
  window.addEventListener("storage", handler)
  window.addEventListener(CHANGE_EVENT, handler)
  media.addEventListener("change", handler)
  return () => {
    window.removeEventListener("storage", handler)
    window.removeEventListener(CHANGE_EVENT, handler)
    media.removeEventListener("change", handler)
  }
}

/**
 * Toggles the `dark` class the Tailwind `dark:` variant and shadcn tokens key
 * off, plus `color-scheme` so form controls and scrollbars follow.
 */
export function applyColorSchemeToDocument(scheme: ResolvedColorScheme): void {
  const root = document.documentElement
  root.classList.toggle("dark", scheme === "dark")
  root.style.colorScheme = scheme
}
