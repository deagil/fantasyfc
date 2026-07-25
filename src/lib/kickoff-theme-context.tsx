import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from "react"

import {
  applyKickoffThemeToDocument,
  getStoredKickoffTheme,
  subscribeKickoffTheme,
  setStoredKickoffTheme,
} from "@/lib/kickoff-theme"
import type { KickoffThemeId } from "@/lib/kickoff-theme"

type KickoffThemeContextValue = {
  theme: KickoffThemeId
  setTheme: (theme: KickoffThemeId) => void
}

const KickoffThemeContext = createContext<KickoffThemeContextValue | null>(null)

const defaultKickoffTheme: KickoffThemeId = "late-kickoff"

export function KickoffThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const theme = useSyncExternalStore(
    subscribeKickoffTheme,
    getStoredKickoffTheme,
    () => defaultKickoffTheme
  )

  // Layout effect so we win over hydration resetting head/html before paint.
  // Always read localStorage so the SSR/hydration "late-kickoff" snapshot cannot
  // paint plum over an early-kickoff preference the boot script already applied.
  useLayoutEffect(() => {
    applyKickoffThemeToDocument(getStoredKickoffTheme())
  }, [theme])

  const setTheme = useCallback((nextTheme: KickoffThemeId) => {
    applyKickoffThemeToDocument(nextTheme)
    setStoredKickoffTheme(nextTheme)
  }, [])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme, setTheme]
  )

  return (
    <KickoffThemeContext.Provider value={value}>
      {children}
    </KickoffThemeContext.Provider>
  )
}

export function useKickoffTheme(): KickoffThemeContextValue {
  const context = useContext(KickoffThemeContext)
  if (!context) {
    throw new Error("useKickoffTheme must be used within KickoffThemeProvider")
  }

  return context
}
