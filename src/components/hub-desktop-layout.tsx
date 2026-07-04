import { useMediaQuery } from "@/hooks/use-media-query"
import { hubTileGridClassName } from "@/lib/layout"
import { cn } from "@/lib/utils"

import { LeagueInspectorPanel } from "@/components/league-inspector-panel"

export function HubDesktopLayout({ children }: { children: React.ReactNode }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  if (!isDesktop) {
    return <div className={hubTileGridClassName}>{children}</div>
  }

  return (
    <div className="hub-desktop-layout">
      <div className={cn(hubTileGridClassName, "min-w-0 shrink-0")}>{children}</div>
      <LeagueInspectorPanel />
    </div>
  )
}
