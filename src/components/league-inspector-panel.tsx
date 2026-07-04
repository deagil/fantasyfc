import { useCallback, useState } from "react"
import { createPortal } from "react-dom"
import { XIcon } from "lucide-react"

import { ScrollFade } from "@/components/scroll-fade"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useFplStandingsQuery } from "@/lib/fpl/hooks"
import { useLeaguesInspector } from "@/lib/fpl/leagues-inspector-context"
import type { FplClassicLeague, FplLeagueStanding } from "@/lib/fpl/types"
import { useTeam } from "@/lib/fpl/team-context"
import { cn } from "@/lib/utils"

function RankChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return <span className="text-xs font-medium text-chart-2">+{change}</span>
  }

  if (change < 0) {
    return (
      <span className="text-xs font-medium text-destructive">{change}</span>
    )
  }

  return <span className="text-xs text-muted-foreground">—</span>
}

function StandingRow({
  standing,
  isCurrentTeam,
}: {
  standing: FplLeagueStanding
  isCurrentTeam: boolean
}) {
  const rankChange = standing.last_rank - standing.rank

  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2",
        isCurrentTeam && "bg-chart-2/10 ring-1 ring-inset ring-chart-2/20"
      )}
    >
      <span className="w-7 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
        {standing.rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{standing.entry_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {standing.player_name}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-sm font-semibold tabular-nums">
          {standing.total}
        </span>
        <RankChangeIndicator change={rankChange} />
      </div>
    </div>
  )
}

function LeagueInspectorStandings({
  league,
}: {
  league: FplClassicLeague
}) {
  const { teamId } = useTeam()
  const standingsQuery = useFplStandingsQuery(league.id, { enabled: true })

  const standings = standingsQuery.data?.standings.results ?? []
  const isLoading = standingsQuery.isPending && standings.length === 0
  const error = standingsQuery.error ? "Could not load standings." : null

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 px-3 py-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  if (error) {
    return <p className="px-3 py-2 text-sm text-destructive">{error}</p>
  }

  return (
    <>
      {standings.map((standing) => (
        <StandingRow
          key={standing.id}
          standing={standing}
          isCurrentTeam={standing.entry === teamId}
        />
      ))}
    </>
  )
}

export function LeagueInspectorPanel() {
  const { selectedLeague, isOpen, closeInspector } = useLeaguesInspector()
  const [leagueIdCopied, setLeagueIdCopied] = useState(false)

  const copyLeagueId = useCallback(async () => {
    if (!selectedLeague) {
      return
    }

    try {
      await navigator.clipboard.writeText(String(selectedLeague.id))
      setLeagueIdCopied(true)
      window.setTimeout(() => setLeagueIdCopied(false), 2000)
    } catch {
      // Clipboard unavailable
    }
  }, [selectedLeague])

  if (!isOpen || !selectedLeague || typeof document === "undefined") {
    return null
  }

  return createPortal(
    <aside
      role="dialog"
      aria-labelledby="league-inspector-title"
      data-slot="league-inspector"
      className={cn(
        "fixed z-50 hidden min-h-0 flex-col overflow-hidden lg:flex",
        "border border-(--tile-border) bg-(--tile-bg) text-(--tile-fg)",
        "shadow-[0_8px_32px_rgb(61_25_91_/_0.12),0_2px_8px_rgb(61_25_91_/_0.06)]",
        "lg:right-4 lg:bottom-4 lg:h-[min(68dvh,32rem)] lg:w-[min(33vw,22rem)] lg:rounded-[2px]",
        "animate-in fade-in slide-in-from-bottom-4 duration-200 lg:slide-in-from-bottom-2"
      )}
    >
      <header className="flex shrink-0 items-start gap-2 border-b border-(--tile-border) px-3 py-3">
        <div className="min-w-0 flex-1">
          <h2
            id="league-inspector-title"
            className="truncate font-heading text-sm font-semibold"
          >
            {selectedLeague.name}
          </h2>
          <p className="text-xs text-(--tile-muted-fg)">
            {selectedLeague.rank_count.toLocaleString()} teams
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shell-chrome-btn h-7 px-2 text-xs"
            onClick={() => void copyLeagueId()}
          >
            {leagueIdCopied ? "Copied" : "Copy ID"}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="shell-chrome-btn"
            onClick={closeInspector}
            aria-label="Close league standings"
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      </header>
      <ScrollFade
        className="min-h-0 flex-1"
        fadeFrom="--tile-bg"
        contentClassName="flex flex-col pb-3"
      >
        <LeagueInspectorStandings league={selectedLeague} />
      </ScrollFade>
    </aside>,
    document.body
  )
}
