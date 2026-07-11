import { RatingCategoryBreakdown } from "@/components/rating-category-breakdown"
import { PlayerTradingCard } from "@/components/player-trading-card"
import { DataTile } from "@/components/data-tile"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getElementTypeLabel,
  getPlayerClubShortName,
} from "@/lib/fpl/players"
import type { FplElement, FplTeam } from "@/lib/fpl/types"
import { usePlayerRatingsById } from "@/lib/ratings/hooks"
import { cn } from "@/lib/utils"

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
  const { ratingsById, isLoading: ratingsLoading } = usePlayerRatingsById()

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

  const clubShortName = getPlayerClubShortName(player, teamsById)
  const positionLabel = getElementTypeLabel(player.element_type)
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

      <div className="rounded-xl bg-muted/40 p-4">
        <DataTile.Label className="text-sm">Scout summary</DataTile.Label>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {player.web_name} is a {positionLabel.toLowerCase()} at {clubShortName} with{" "}
          {player.total_points} season points. Detailed fixtures and history will appear
          here in a later pass.
        </p>
      </div>
    </div>
  )
}
