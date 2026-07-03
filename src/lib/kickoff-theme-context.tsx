import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

import {
  getStoredKickoffTheme,
  type KickoffThemeId,
  setStoredKickoffTheme,
} from "@/lib/kickoff-theme"

type KickoffThemeContextValue = {
  theme: KickoffThemeId
  setTheme: (theme: KickoffThemeId) => void
}

const KickoffThemeContext = createContext<KickoffThemeContextValue | null>(null)

function getInitialKickoffTheme(): KickoffThemeId {
  if (typeof window === "undefined") {
    return "late-kickoff"
  }

  return getStoredKickoffTheme()
}

export function KickoffThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [theme, setThemeState] = useState<KickoffThemeId>(getInitialKickoffTheme)

  const setTheme = useCallback((nextTheme: KickoffThemeId) => {
    setThemeState(nextTheme)
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
