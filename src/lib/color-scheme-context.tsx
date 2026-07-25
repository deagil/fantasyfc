import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from "react"

import {
  applyColorSchemeToDocument,
  defaultColorSchemePreference,
  defaultResolvedColorScheme,
  getResolvedColorScheme,
  getStoredColorSchemePreference,
  resolveColorScheme,
  setStoredColorSchemePreference,
  subscribeColorScheme,
} from "@/lib/color-scheme"
import type {
  ColorSchemePreference,
  ResolvedColorScheme,
} from "@/lib/color-scheme"
import {
  applyKickoffThemeToDocument,
  getStoredKickoffTheme,
} from "@/lib/kickoff-theme"

type ColorSchemeContextValue = {
  preference: ColorSchemePreference
  scheme: ResolvedColorScheme
  setPreference: (preference: ColorSchemePreference) => void
}

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null)

/** Backdrop and status bar colours depend on both axes, so re-apply together. */
function applyColorScheme(scheme: ResolvedColorScheme): void {
  applyColorSchemeToDocument(scheme)
  applyKickoffThemeToDocument(getStoredKickoffTheme(), scheme)
}

export function ColorSchemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const preference = useSyncExternalStore(
    subscribeColorScheme,
    getStoredColorSchemePreference,
    () => defaultColorSchemePreference
  )
  const scheme = useSyncExternalStore(
    subscribeColorScheme,
    getResolvedColorScheme,
    () => defaultResolvedColorScheme
  )

  // Layout effect so hydration can't paint the SSR light default over a stored
  // preference the boot script already applied.
  useLayoutEffect(() => {
    applyColorScheme(getResolvedColorScheme())
  }, [scheme])

  const setPreference = useCallback((next: ColorSchemePreference) => {
    applyColorScheme(resolveColorScheme(next))
    setStoredColorSchemePreference(next)
  }, [])

  const value = useMemo(
    () => ({ preference, scheme, setPreference }),
    [preference, scheme, setPreference]
  )

  return (
    <ColorSchemeContext.Provider value={value}>
      {children}
    </ColorSchemeContext.Provider>
  )
}

export function useColorScheme(): ColorSchemeContextValue {
  const context = useContext(ColorSchemeContext)
  if (!context) {
    throw new Error("useColorScheme must be used within ColorSchemeProvider")
  }

  return context
}
