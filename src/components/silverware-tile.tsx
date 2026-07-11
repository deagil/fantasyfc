import { Link } from "@tanstack/react-router"

import { DataTile } from "@/components/data-tile"
import { TrophyMark } from "@/components/trophy-mark"
import { Skeleton } from "@/components/ui/skeleton"
import { useTeam } from "@/lib/fpl/team-context"
import {
  getSilverwareTitles,
  medalOrdinal,
} from "@/lib/trophies/silverware"
import type { SilverwareTitle } from "@/lib/trophies/silverware"

const PLACEHOLDER_SLOTS = 3

function EmptyTrophySlot() {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <div
        aria-hidden="true"
        className="aspect-square w-full max-w-16 rounded-full border border-dashed border-foreground/20 bg-foreground/[0.04]"
      />
      <p className="w-full truncate text-center text-xs text-muted-foreground">
        Open
      </p>
      <p className="text-sm font-medium text-muted-foreground/70">—</p>
    </div>
  )
}

function TitleCard({ title }: { title: SilverwareTitle }) {
  return (
    <Link
      to="/trophy/$leagueId"
      params={{ leagueId: String(title.leagueId) }}
      className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-(--shell-foreground)/30"
    >
      <TrophyMark leagueId={title.leagueId} medal={title.medal} />
      <p className="w-full truncate text-center text-sm font-medium">
        {title.leagueName}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {title.leagueSize > 0 ? `${title.leagueSize} managers` : medalOrdinal(title.medal)}
      </p>
    </Link>
  )
}

function SilverwareSkeleton() {
  return (
    <div className="flex w-full gap-4">
      {(["a", "b", "c"] as const).map((id) => (
        <div key={id} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <Skeleton className="aspect-square w-full max-w-16 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  )
}

export function SilverwareTile({
  className,
  comingSoon = false,
}: {
  className?: string
  comingSoon?: boolean
}) {
  const { entry, isLoggedIn, isLoading } = useTeam()
  const titles = entry ? getSilverwareTitles(entry.leagues.classic) : []
  const visibleTitles = titles.slice(0, PLACEHOLDER_SLOTS)
  const emptySlots = Math.max(0, PLACEHOLDER_SLOTS - visibleTitles.length)

  return (
    <DataTile size="2x1" comingSoon={comingSoon} className={className}>
      <div className="flex h-full min-h-0 flex-col">
        <DataTile.Header className="p-3 pb-0">
          <DataTile.Heading>
            <DataTile.Label>Silverware</DataTile.Label>
            <DataTile.Subtitle>25/26</DataTile.Subtitle>
          </DataTile.Heading>
        </DataTile.Header>

        <DataTile.Content align="center" className="flex-1 p-3 pt-2">
          {!isLoggedIn ? (
            <DataTile.EmptyState className="text-center">
              Connect your team to see this season&apos;s titles.
            </DataTile.EmptyState>
          ) : isLoading && !entry ? (
            <SilverwareSkeleton />
          ) : (
            <div className="flex w-full items-start justify-center gap-4">
              {visibleTitles.map((title) => (
                <TitleCard key={title.leagueId} title={title} />
              ))}
              {Array.from({ length: emptySlots }, (_, index) => (
                <EmptyTrophySlot key={`open-${index}`} />
              ))}
            </div>
          )}
        </DataTile.Content>
      </div>
    </DataTile>
  )
}
