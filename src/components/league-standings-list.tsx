import { Link } from "@tanstack/react-router"
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react"

import { ScrollFade } from "@/components/scroll-fade"
import { Skeleton } from "@/components/ui/skeleton"
import type { FplLeagueStanding } from "@/lib/fpl/types"
import { cn } from "@/lib/utils"

export function RankChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-chart-2">
        <ArrowUpIcon className="size-3" />
        {change}
      </span>
    )
  }

  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-destructive">
        <ArrowDownIcon className="size-3" />
        {Math.abs(change)}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center text-xs text-muted-foreground">
      <MinusIcon className="size-3" />
    </span>
  )
}

export function StandingRow({
  standing,
  isCurrentTeam,
  fromLeague,
}: {
  standing: FplLeagueStanding
  isCurrentTeam: boolean
  fromLeague?: number
}) {
  const rankChange = standing.last_rank - standing.rank

  return (
    <Link
      to="/team/$entryId"
      params={{ entryId: String(standing.entry) }}
      search={fromLeague != null ? { fromLeague } : {}}
      data-tile-row
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2.5 text-left",
        isCurrentTeam && "bg-chart-2/10 ring-1 ring-inset ring-chart-2/20"
      )}
    >
      <span className="w-8 shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
        {standing.rank}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{standing.entry_name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {standing.player_name}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-sm font-semibold tabular-nums">{standing.total}</span>
        <RankChangeIndicator change={rankChange} />
      </div>
    </Link>
  )
}

export function LeagueStandingsList({
  standings,
  currentTeamId,
  isLoading,
  error,
  contentClassName,
  fadeFrom,
  fromLeague,
}: {
  standings: FplLeagueStanding[]
  currentTeamId: number | null
  isLoading: boolean
  error: string | null
  contentClassName?: string
  fadeFrom?: string
  fromLeague?: number
}) {
  return (
    <ScrollFade
      className="flex min-h-0 w-full flex-1"
      fadeFrom={fadeFrom}
      contentClassName={cn("flex w-full flex-col", contentClassName)}
    >
      {isLoading ? (
        <div className="flex w-full flex-col gap-2 px-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <p className="px-4 text-sm text-destructive">{error}</p>
      ) : standings.length === 0 ? (
        <p className="flex min-h-40 flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
          League members are pending
        </p>
      ) : (
        standings.map((standing) => (
          <StandingRow
            key={standing.id}
            standing={standing}
            isCurrentTeam={standing.entry === currentTeamId}
            fromLeague={fromLeague}
          />
        ))
      )}
    </ScrollFade>
  )
}
