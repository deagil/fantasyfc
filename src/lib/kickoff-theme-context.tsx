import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react"

import {
  getStoredKickoffTheme,
  subscribeKickoffTheme,
  type KickoffThemeId,
  setStoredKickoffTheme,
} from "@/lib/kickoff-theme"

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

  const setTheme = useCallback((nextTheme: KickoffThemeId) => {
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
