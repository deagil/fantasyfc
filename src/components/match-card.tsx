import type { ReactNode } from "react"

import { MATCH_CARD_HEADER, MATCH_SIDES_GRID } from "@/components/match-layout"
import { cn } from "@/lib/utils"

export function MatchCard({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-xl bg-foreground/3 py-3", className)}>
      <p className={MATCH_CARD_HEADER}>{title}</p>
      {children}
    </div>
  )
}

export function MatchSidesColumns({
  home,
  away,
  className,
}: {
  home: ReactNode
  away: ReactNode
  className?: string
}) {
  return (
    <div className={cn(MATCH_SIDES_GRID, "items-start", className)}>
      <div className="min-w-0 text-center">{home}</div>
      <div aria-hidden className="min-h-px" />
      <div className="min-w-0 text-center">{away}</div>
    </div>
  )
}
