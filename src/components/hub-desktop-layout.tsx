import { useMediaQuery } from "@/hooks/use-media-query"
import { hubDesktopAlignClassName, hubTileGridClassName } from "@/lib/layout"
import { cn } from "@/lib/utils"

import { LeagueInspectorPanel } from "@/components/league-inspector-panel"

export function HubDesktopLayout({ children }: { children: React.ReactNode }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  if (!isDesktop) {
    return <div className={hubTileGridClassName}>{children}</div>
  }

  return (
    <div className={cn(hubTileGridClassName, hubDesktopAlignClassName)}>
      {children}
      <LeagueInspectorPanel />
    </div>
  )
}
