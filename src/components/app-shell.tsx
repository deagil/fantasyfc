import { appShellClassName } from "@/lib/layout"
import { useKickoffTheme } from "@/lib/kickoff-theme-context"
import { cn } from "@/lib/utils"

type AppShellProps = {
  className?: string
  children: React.ReactNode
}

export function AppShell({ className, children }: AppShellProps) {
  const { theme } = useKickoffTheme()

  return (
    <div
      className={cn(appShellClassName, className)}
      data-kickoff-theme={theme}
    >
      {children}
    </div>
  )
}
