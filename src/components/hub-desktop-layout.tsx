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
    <div
      className={cn(
        "hub-desktop-layout mx-auto w-full min-w-0",
        hubDesktopAlignClassName
      )}
    >
      <div className={cn(hubTileGridClassName, "min-w-0 shrink-0")}>{children}</div>
      <LeagueInspectorPanel />
    </div>
  )
}
