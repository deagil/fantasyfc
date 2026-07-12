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

function syncDocumentTheme(theme: KickoffThemeId) {
  document.documentElement.dataset.kickoffTheme = theme

  const color = getKickoffThemeColor(theme)
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement("meta")
    meta.setAttribute("name", "theme-color")
    document.head.appendChild(meta)
  }
  meta.setAttribute("content", color)
}

/**
 * Runs before paint when inlined in <head>. Mirrors syncDocumentTheme for the
 * stored preference so Safari safe-area letterboxing isn't white on first frame.
 */
export const kickoffThemeBootScript = `(function(){try{var k="deadline-kickoff-theme";var t=localStorage.getItem(k);if(t!=="early-kickoff"&&t!=="late-kickoff")t="late-kickoff";document.documentElement.dataset.kickoffTheme=t;var c=t==="early-kickoff"?"#8ec8e0":"#5c3d7a";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",c);}catch(e){}})();`

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
    syncDocumentTheme(theme)
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
