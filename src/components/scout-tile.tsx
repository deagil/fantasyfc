import { Link } from "@tanstack/react-router"
import { useMemo } from "react"

import { DataTile } from "@/components/data-tile"
import { ScrollFade } from "@/components/scroll-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { useFplBootstrap } from "@/lib/fpl/bootstrap-context"
import {
  getElementTypeLabel,
  getPlayerClubShortName,
  getPlayerInitials,
} from "@/lib/fpl/players"
import type { FplElement, FplTeam } from "@/lib/fpl/types"
import type { PlayerRatingSummary } from "@/lib/ratings/model"
import { usePlayerRatings } from "@/lib/ratings/hooks"
import { ratingTextClassName } from "@/lib/ratings/tone"
import type { ScoutPreset } from "@/lib/scouts/presets"
import { sortPlayersForScout } from "@/lib/scouts/sort"
import { cn } from "@/lib/utils"

const FEATURED_PREVIEW_COUNT = 20
const HUB_PREVIEW_COUNT = 3

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

/** Compact preview for 1×1 hub scout tiles — top players in that scout's ranking. */
function TopPlayersPreview({
  players,
  ratingsById,
  teamsById,
  isLoading,
}: {
  players: FplElement[]
  ratingsById: Map<number, PlayerRatingSummary>
  teamsById: Map<number, FplTeam>
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    )
  }

  if (players.length === 0) {
    return null
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5">
      {players.map((player) => {
        const overall = ratingsById.get(player.id)?.overall ?? null
        const clubShortName = getPlayerClubShortName(player, teamsById)
        const positionLabel = getElementTypeLabel(player.element_type)

        return (
          <div
            key={player.id}
            className="flex min-w-0 items-center gap-2 rounded-lg bg-foreground/4 px-2 py-1.5"
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground"
            >
              {getPlayerInitials(player.web_name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {player.web_name}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {clubShortName} · {positionLabel}
              </p>
            </div>
            {overall != null ? (
              <span
                className={cn(
                  "shrink-0 text-base font-semibold tabular-nums leading-none",
                  ratingTextClassName(overall)
                )}
              >
                {overall}
              </span>
            ) : null}
          </div>
        )
      })}
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

  const ratingsById = useMemo(() => {
    const map = new Map<number, PlayerRatingSummary>()
    for (const rating of ratingsPayload?.ratings ?? []) {
      map.set(rating.id, rating)
    }
    return map
  }, [ratingsPayload?.ratings])

  const rankedPlayers = useMemo(() => {
    const players = bootstrap?.elements ?? []
    return sortPlayersForScout(players, scout, ratingsById)
  }, [bootstrap?.elements, ratingsById, scout])

  const topRatedPlayers = useMemo(() => {
    if (!isFeatured) {
      return []
    }

    return rankedPlayers
      .slice(0, FEATURED_PREVIEW_COUNT)
      .flatMap((player) => {
        const rating = ratingsById.get(player.id)
        return rating ? [rating] : []
      })
  }, [isFeatured, rankedPlayers, ratingsById])

  const hubPreviewPlayers = isFeatured
    ? []
    : rankedPlayers.slice(0, HUB_PREVIEW_COUNT)

  const isLoading = bootstrapLoading || ratingsLoading

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
          </DataTile.Heading>
        </DataTile.Header>

        <DataTile.Content
          align="between"
          className={cn(
            "min-h-0 flex-1",
            isFeatured ? "justify-between gap-2 pt-1" : "justify-center gap-2 pt-2"
          )}
        >
          {isFeatured ? (
            <FeaturedRatingsPreview
              ratings={topRatedPlayers}
              elementsById={elementsById}
              teamsById={teamsById}
              isLoading={isLoading}
            />
          ) : (
            <TopPlayersPreview
              players={hubPreviewPlayers}
              ratingsById={ratingsById}
              teamsById={teamsById}
              isLoading={isLoading}
            />
          )}
        </DataTile.Content>
      </DataTile>
    </Link>
  )
}
