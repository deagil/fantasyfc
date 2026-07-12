import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react"

import {
  getKickoffThemeColor,
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

function syncThemeColor(theme: KickoffThemeId) {
  const color = getKickoffThemeColor(theme)
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement("meta")
    meta.setAttribute("name", "theme-color")
    document.head.appendChild(meta)
  }
  meta.setAttribute("content", color)
}

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

  useEffect(() => {
    syncThemeColor(theme)
  }, [theme])

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
