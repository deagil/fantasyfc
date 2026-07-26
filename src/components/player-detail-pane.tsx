import { useMemo } from "react"

import { RatingCategoryBreakdown } from "@/components/rating-category-breakdown"
import { PlayerTradingCard } from "@/components/player-trading-card"
import { ScoutSummaryPanel } from "@/components/scout-summary"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getNextUnfinishedEvent,
  getUpcomingTeamFixtures,
} from "@/lib/fixtures/upcoming"
import { useFplBootstrap } from "@/lib/fpl/bootstrap-context"
import { useFplSeasonFixturesQuery } from "@/lib/fpl/hooks"
import { getPlayerClubShortName } from "@/lib/fpl/players"
import type { FplElement, FplTeam } from "@/lib/fpl/types"
import {
  usePlayerRatingDetail,
  usePlayerRatingsById,
  usePlayerSeasonHistory,
} from "@/lib/ratings/hooks"
import { buildScoutSummary } from "@/lib/scouts/summary"
import { cn } from "@/lib/utils"

/** Length of the fixture run shown in the summary strip. */
const FIXTURE_RUN_EVENTS = 5

type PlayerDetailPaneProps = {
  player: FplElement | null
  teamsById: Map<number, FplTeam>
  className?: string
}

export function PlayerDetailPane({
  player,
  teamsById,
  className,
}: PlayerDetailPaneProps) {
  const { bootstrap } = useFplBootstrap()
  const { ratingsById, isLoading: ratingsLoading } = usePlayerRatingsById()
  const { data: detail, isLoading: detailLoading } = usePlayerRatingDetail(
    player?.id ?? null
  )
  const { data: seasonFixtures } = useFplSeasonFixturesQuery()
  const { data: seasonHistory } = usePlayerSeasonHistory(player?.code ?? null)

  const clubShortName = player ? getPlayerClubShortName(player, teamsById) : ""

  const summary = useMemo(() => {
    if (!player) {
      return null
    }

    const fixtures = seasonFixtures ?? []
    const fromEvent = getNextUnfinishedEvent(fixtures)

    return buildScoutSummary({
      player,
      clubShortName,
      rating: ratingsById.get(player.id),
      ratingsById,
      players: bootstrap?.elements ?? [],
      detailCategories: detail?.categories,
      fixtures:
        fromEvent === null
          ? null
          : getUpcomingTeamFixtures(player.team, fixtures, teamsById, {
              fromEvent,
              eventCount: FIXTURE_RUN_EVENTS,
            }),
      history: seasonHistory ?? [],
    })
  }, [
    bootstrap?.elements,
    clubShortName,
    detail?.categories,
    player,
    ratingsById,
    seasonFixtures,
    seasonHistory,
    teamsById,
  ])

  if (!player) {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8 text-center",
          className
        )}
      >
        <p className="text-sm font-medium text-foreground">Select a player</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Choose a player from the grid to view their scout report.
        </p>
      </div>
    )
  }

  const rating = ratingsById.get(player.id)
  const team = teamsById.get(player.team)

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-6 px-4 pb-6 pt-2", className)}>
      {ratingsLoading ? (
        <Skeleton className="mx-auto aspect-320/446 w-full max-w-[300px] rounded-2xl" />
      ) : (
        <PlayerTradingCard
          player={player}
          team={team}
          overall={rating?.overall}
          categories={rating?.categories}
        />
      )}

      <RatingCategoryBreakdown
        playerId={player.id}
        categories={rating?.categories}
        isLoading={ratingsLoading}
      />

      <ScoutSummaryPanel
        summary={summary}
        isLoading={ratingsLoading || detailLoading}
      />
    </div>
  )
}
