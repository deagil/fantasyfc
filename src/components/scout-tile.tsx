import { Link } from "@tanstack/react-router"
import { useMemo } from "react"

import { DataTile } from "@/components/data-tile"
import { ScrollFade } from "@/components/scroll-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { useFplBootstrap } from "@/lib/fpl/bootstrap-context"
import {
  filterPlayersByPosition,
  getElementTypeLabel,
  getPlayerClubShortName,
  getPlayerInitials,
} from "@/lib/fpl/players"
import type { FplElement, FplTeam } from "@/lib/fpl/types"
import type { PlayerRatingSummary } from "@/lib/ratings/model"
import { usePlayerRatings } from "@/lib/ratings/hooks"
import { ratingTextClassName } from "@/lib/ratings/tone"
import type { ScoutPreset } from "@/lib/scouts/presets"
import { cn } from "@/lib/utils"

const FEATURED_PREVIEW_COUNT = 20

function ScoutPreviewCard({
  name,
  clubShortName,
  positionLabel,
  overall,
}: {
  name: string
  clubShortName: string
  positionLabel: string
  overall: number
}) {
  return (
    <div className="flex min-h-19 min-w-0 items-center gap-3 rounded-xl bg-foreground/4 p-3">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground"
      >
        {getPlayerInitials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">{name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {clubShortName} · {positionLabel}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-xl font-semibold tabular-nums leading-none",
          ratingTextClassName(overall)
        )}
      >
        {overall}
      </span>
    </div>
  )
}

function FeaturedRatingsPreview({
  ratings,
  elementsById,
  teamsById,
  isLoading,
}: {
  ratings: PlayerRatingSummary[]
  elementsById: Map<number, FplElement>
  teamsById: Map<number, FplTeam>
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-19 rounded-xl" />
        ))}
      </div>
    )
  }

  if (ratings.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Ratings unavailable</p>
    )
  }

  return (
    <ScrollFade
      className="min-h-0 w-full min-w-0 flex-1"
      contentClassName="grid grid-cols-1 gap-2.5 content-start sm:grid-cols-2"
      fadeFrom="--tile-bg"
    >
      {ratings.map((rating) => {
        const element = elementsById.get(rating.id)
        const clubShortName = element
          ? getPlayerClubShortName(element, teamsById)
          : "—"

        return (
          <ScoutPreviewCard
            key={rating.id}
            name={rating.webName}
            clubShortName={clubShortName}
            positionLabel={getElementTypeLabel(rating.elementType)}
            overall={rating.overall}
          />
        )
      })}
    </ScrollFade>
  )
}

export function ScoutTile({
  scout,
  className,
  titleStyle,
}: {
  scout: ScoutPreset
  className?: string
  titleStyle?: React.CSSProperties
}) {
  const { bootstrap, teamsById, elementsById, isLoading: bootstrapLoading } =
    useFplBootstrap()
  const { data: ratingsPayload, isLoading: ratingsLoading } = usePlayerRatings()

  const isFeatured = scout.featured === true

  const topRatedPlayers = useMemo(() => {
    if (!isFeatured) {
      return []
    }

    const ratings = ratingsPayload?.ratings ?? []
    const filtered =
      scout.positionFilter === "all"
        ? ratings
        : ratings.filter((rating) => {
            const label = getElementTypeLabel(rating.elementType)
            return label === scout.positionFilter
          })

    return [...filtered]
      .sort((a, b) => b.overall - a.overall || a.webName.localeCompare(b.webName))
      .slice(0, FEATURED_PREVIEW_COUNT)
  }, [isFeatured, ratingsPayload?.ratings, scout.positionFilter])

  const playerCount = useMemo(() => {
    const players = bootstrap?.elements ?? []
    return filterPlayersByPosition(players, scout.positionFilter).length
  }, [bootstrap?.elements, scout.positionFilter])

  const isLoading = bootstrapLoading || (isFeatured && ratingsLoading)

  return (
    <Link
      to="/scouts/$scoutSlug"
      params={{ scoutSlug: scout.slug }}
      data-tile-link=""
      className={cn(
        "block h-full min-h-0 outline-none focus-visible:ring-2 focus-visible:ring-(--shell-foreground)/30",
        className
      )}
    >
      <DataTile
        interactive
        size={isFeatured ? "2x2" : "1x1"}
        className="group/scout-tile h-full"
      >
        <DataTile.Header className={cn(isFeatured ? "pb-2" : "pb-0")}>
          <DataTile.Heading>
            <DataTile.Label style={titleStyle}>{scout.name}</DataTile.Label>
            <DataTile.Subtitle className="text-sm font-medium">
              {scout.subtitle}
            </DataTile.Subtitle>
          </DataTile.Heading>
        </DataTile.Header>

        <DataTile.Content
          align={isFeatured ? "between" : "center"}
          className={cn(
            "min-h-0 flex-1",
            isFeatured ? "justify-between gap-2 pt-1" : "justify-end pt-0"
          )}
        >
          {isFeatured ? (
            <FeaturedRatingsPreview
              ratings={topRatedPlayers}
              elementsById={elementsById}
              teamsById={teamsById}
              isLoading={isLoading}
            />
          ) : null}

          <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {isLoading
              ? "Loading…"
              : isFeatured
                ? `Top ${topRatedPlayers.length} · ${playerCount.toLocaleString()} players`
                : `${playerCount.toLocaleString()} players`}
          </p>
        </DataTile.Content>
      </DataTile>
    </Link>
  )
}
