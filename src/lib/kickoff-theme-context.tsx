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
  kickoffBackdropColors,
  kickoffBackdropImages,
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

/**
 * Runs before paint when inlined in <head>. Sets dataset, CSS variables, and
 * theme-color from localStorage so Safari overscroll isn't stuck on the SSR
 * late-kickoff plum while the shell hydrates to early-kickoff.
 */
export const kickoffThemeBootScript = `(function(){try{var k="deadline-kickoff-theme";var t=localStorage.getItem(k);if(t!=="early-kickoff"&&t!=="late-kickoff")t="late-kickoff";var c=${JSON.stringify(kickoffBackdropColors)};var i=${JSON.stringify(kickoffBackdropImages)};var root=document.documentElement;root.dataset.kickoffTheme=t;root.style.setProperty("--shell-backdrop-color",c[t]);root.style.setProperty("--shell-backdrop-image",i[t]);var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.setAttribute("name","theme-color");document.head.appendChild(m);}m.setAttribute("content",c[t]);}catch(e){}})();`

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
