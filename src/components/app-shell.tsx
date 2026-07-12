import { useLayoutEffect } from "react"

import {
  applyKickoffThemeToDocument,
  getStoredKickoffTheme,
} from "@/lib/kickoff-theme"
import { appShellClassName } from "@/lib/layout"
import { useKickoffTheme } from "@/lib/kickoff-theme-context"
import { cn } from "@/lib/utils"

type AppShellProps = {
  className?: string
  children: React.ReactNode
}

export function AppShell({ className, children }: AppShellProps) {
  const { theme } = useKickoffTheme()

  // Keep root backdrop / theme-color in lockstep with the visible shell theme.
  // Safari overscroll only shows the solid html/body colour, not the shell gradient.
  useLayoutEffect(() => {
    applyKickoffThemeToDocument(getStoredKickoffTheme())
  }, [theme])

  return (
    <div
      className={cn(appShellClassName, className)}
      data-kickoff-theme={theme}
    >
      {children}
    </div>
  )
}
