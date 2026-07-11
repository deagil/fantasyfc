import { DataTile } from "@/components/data-tile"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatPlayerForm,
  formatPlayerOwnership,
  formatPlayerPrice,
  formatPlayerStatus,
  getElementTypeLabel,
  getPlayerClubShortName,
  getPlayerInitials,
} from "@/lib/fpl/players"
import type { FplElement, FplTeam } from "@/lib/fpl/types"
import type { CategoryId } from "@/lib/ratings/model"
import { usePlayerRatingsById } from "@/lib/ratings/hooks"
import {
  ratingSurfaceClassName,
  ratingTextClassName,
} from "@/lib/ratings/tone"
import { cn } from "@/lib/utils"

type PlayerDetailPaneProps = {
  player: FplElement | null
  teamsById: Map<number, FplTeam>
  className?: string
}

const CATEGORY_ORDER: CategoryId[] = [
  "ATK",
  "GKP",
  "PLY",
  "IMP",
  "DEF",
  "REL",
  "FPL",
]

const CATEGORY_LABELS: Record<CategoryId, string> = {
  ATK: "ATK",
  PLY: "PLY",
  IMP: "IMP",
  DEF: "DEF",
  REL: "REL",
  FPL: "FPL",
  GKP: "GKP",
}

function DetailStat({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string
  value: React.ReactNode
  className?: string
  valueClassName?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-lg font-semibold tabular-nums", valueClassName)}>
        {value}
      </span>
    </div>
  )
}

function RatingCategories({
  categories,
  overall,
  isLoading,
}: {
  categories: Partial<Record<CategoryId, number>> | undefined
  overall: number | undefined
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-7">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!categories) {
    return null
  }

  const scores = CATEGORY_ORDER.filter((id) => categories[id] != null)

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-7">
      <DetailStat
        label="OVR"
        value={overall ?? "—"}
        className={cn(
          "rounded-lg px-2.5 py-2",
          overall != null ? ratingSurfaceClassName(overall) : "bg-foreground/4"
        )}
        valueClassName={
          overall != null ? ratingTextClassName(overall) : undefined
        }
      />
      {scores.map((id) => {
        const score = categories[id]
        return (
          <DetailStat
            key={id}
            label={CATEGORY_LABELS[id]}
            value={score}
            className={cn(
              "rounded-lg px-2.5 py-2",
              score != null ? ratingSurfaceClassName(score) : "bg-foreground/4"
            )}
            valueClassName={
              score != null ? ratingTextClassName(score) : undefined
            }
          />
        )
      })}
    </div>
  )
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

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-6 px-4 pb-6 pt-2", className)}>
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground"
        >
          {getPlayerInitials(player.web_name)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl font-semibold tracking-tight">
            {player.web_name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {clubShortName} · {positionLabel}
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatPlayerStatus(player.status)}
          </p>
        </div>
      </div>

      <RatingCategories
        categories={rating?.categories}
        overall={rating?.overall}
        isLoading={ratingsLoading}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <DetailStat label="Price" value={formatPlayerPrice(player.now_cost)} />
        <DetailStat label="Form" value={formatPlayerForm(player.form)} />
        <DetailStat label="Points" value={player.total_points} />
        <DetailStat
          label="Owned"
          value={formatPlayerOwnership(player.selected_by_percent)}
        />
      </div>

      <div className="rounded-xl bg-muted/40 p-4">
        <DataTile.Label className="text-sm">Scout summary</DataTile.Label>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {player.web_name} is a {positionLabel.toLowerCase()} at {clubShortName} with{" "}
          {player.total_points} season points and a current form of{" "}
          {formatPlayerForm(player.form)}. Detailed fixtures and history will appear here
          in a later pass.
        </p>
      </div>
    </div>
  )
}
