import { useCallback, useEffect, useMemo, useState } from "react"
import { useServerFn } from "@tanstack/react-start"

import { DataTile } from "@/components/data-tile"
import { Skeleton } from "@/components/ui/skeleton"
import { useNow } from "@/hooks/use-now"
import { useFplBootstrap } from "@/lib/fpl/bootstrap-context"
import { resolveGameweekPhase, type GameweekPhase } from "@/lib/fpl/gameweek"
import {
  buildPointsByElementId,
  getTopScorers,
  type TeamTopScorer,
} from "@/lib/fpl/picks"
import { getFplEntryPicks, getFplEventLive } from "@/lib/fpl/server"
import { useTeam } from "@/lib/fpl/team-context"
import { cn } from "@/lib/utils"

const LIVE_REFRESH_MS = 60_000

function canLoadTopScorers(phase: GameweekPhase | null): phase is GameweekPhase {
  if (!phase) {
    return false
  }

  switch (phase.type) {
    case "locked":
    case "live":
    case "post-gameweek":
      return true
    case "countdown":
    case "off-season":
      return false
    default: {
      const exhaustiveCheck: never = phase
      return exhaustiveCheck
    }
  }
}

function TopScorerCard({ scorer }: { scorer: TeamTopScorer }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <div
        aria-hidden="true"
        className="aspect-square w-full max-w-24 rounded-md bg-foreground/[0.06]"
      />
      <p className="w-full truncate text-center text-sm font-medium">{scorer.name}</p>
      <p className="text-lg font-semibold tabular-nums leading-none">{scorer.points}</p>
    </div>
  )
}

function TopScorersSkeleton() {
  return (
    <div className="flex w-full gap-4">
      {(["scorer-a", "scorer-b", "scorer-c"] as const).map((id) => (
        <div key={id} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <Skeleton className="aspect-square w-full max-w-24 rounded-md" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-8" />
        </div>
      ))}
    </div>
  )
}

export function NewsTile({
  className,
  comingSoon = false,
}: {
  className?: string
  comingSoon?: boolean
}) {
  const now = useNow(1_000)
  const { bootstrap, fixtures, teamsById, elementsById, isLoading: isBootstrapLoading } =
    useFplBootstrap()
  const { teamId, isLoggedIn, isLoading: isTeamLoading } = useTeam()
  const fetchPicks = useServerFn(getFplEntryPicks)
  const fetchLive = useServerFn(getFplEventLive)
  const [topScorers, setTopScorers] = useState<TeamTopScorer[] | null>(null)
  const [isScorersLoading, setIsScorersLoading] = useState(false)
  const [scorersError, setScorersError] = useState<string | null>(null)

  const phase = useMemo(() => {
    if (!bootstrap) {
      return null
    }

    return resolveGameweekPhase(now, bootstrap.events, fixtures, teamsById)
  }, [bootstrap, fixtures, now, teamsById])

  const eventId = phase?.event.id ?? null
  const phaseType = phase?.type ?? null
  const shouldLoadTopScorers =
    isLoggedIn && teamId !== null && canLoadTopScorers(phase)

  const loadTopScorers = useCallback(async () => {
    if (!teamId || eventId === null) {
      return
    }

    setIsScorersLoading(true)
    setScorersError(null)

    try {
      const [picksData, liveData] = await Promise.all([
        fetchPicks({ data: { teamId, event: eventId } }),
        fetchLive({ data: { event: eventId } }),
      ])

      const pointsByElementId = buildPointsByElementId(liveData.elements)
      setTopScorers(
        getTopScorers(picksData.picks, pointsByElementId, elementsById)
      )
    } catch {
      setTopScorers(null)
      setScorersError("Could not load top scorers.")
    } finally {
      setIsScorersLoading(false)
    }
  }, [elementsById, eventId, fetchLive, fetchPicks, teamId])

  useEffect(() => {
    if (!shouldLoadTopScorers) {
      setTopScorers(null)
      setScorersError(null)
      return
    }

    void loadTopScorers()
  }, [loadTopScorers, shouldLoadTopScorers])

  useEffect(() => {
    if (phaseType !== "live" || !shouldLoadTopScorers) {
      return
    }

    const intervalId = window.setInterval(() => {
      void loadTopScorers()
    }, LIVE_REFRESH_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [loadTopScorers, phaseType, shouldLoadTopScorers])

  const subtitle = phase ? `GW ${phase.event.id} · Top scorers` : "Top scorers"

  return (
    <DataTile size="2x1" comingSoon={comingSoon} className={className}>
      <div className="flex h-full min-h-0 flex-col">
        <DataTile.Header className="p-3 pb-0">
          <DataTile.Heading>
            <DataTile.Label>News</DataTile.Label>
            <DataTile.Subtitle>{subtitle}</DataTile.Subtitle>
          </DataTile.Heading>
        </DataTile.Header>

        <DataTile.Content align="center" className="flex-1 p-3 pt-2">
          {!isLoggedIn ? (
            <DataTile.EmptyState className="text-center">
              Connect your team to see top scorers.
            </DataTile.EmptyState>
          ) : isBootstrapLoading && !bootstrap ? (
            <TopScorersSkeleton />
          ) : isTeamLoading && !teamId ? (
            <TopScorersSkeleton />
          ) : isScorersLoading && !topScorers ? (
            <TopScorersSkeleton />
          ) : scorersError && !topScorers ? (
            <DataTile.EmptyState className="text-center text-destructive">
              {scorersError}
            </DataTile.EmptyState>
          ) : topScorers ? (
            <div className={cn("flex w-full items-start justify-center gap-4")}>
              {topScorers.map((scorer) => (
                <TopScorerCard key={scorer.id} scorer={scorer} />
              ))}
            </div>
          ) : phase && !canLoadTopScorers(phase) ? (
            <DataTile.EmptyState className="text-center">
              Top scorers appear once the gameweek is locked.
            </DataTile.EmptyState>
          ) : null}
        </DataTile.Content>
      </div>
    </DataTile>
  )
}
