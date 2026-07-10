import { DataTile } from "@/components/data-tile"
import { Skeleton } from "@/components/ui/skeleton"
import { useTeam } from "@/lib/fpl/team-context"
import {
  getSilverwareTitles,
  medalOrdinal,
} from "@/lib/trophies/silverware"
import type { SilverwareTitle } from "@/lib/trophies/silverware"
import type { TrophyMedal } from "@/lib/trophies/types"
import { cn } from "@/lib/utils"

const PLACEHOLDER_SLOTS = 3

const medalSurfaceClassName: Record<TrophyMedal, string> = {
  gold: "bg-[color-mix(in_oklab,var(--pl-yellow)_88%,white)] text-[var(--pl-purple)] ring-[color-mix(in_oklab,var(--pl-yellow)_55%,transparent)]",
  silver:
    "bg-[color-mix(in_oklab,white_70%,var(--pl-purple))] text-[var(--pl-purple)] ring-[color-mix(in_oklab,var(--pl-purple)_18%,transparent)]",
  bronze:
    "bg-[color-mix(in_oklab,var(--pl-orange)_82%,white)] text-[var(--pl-purple)] ring-[color-mix(in_oklab,var(--pl-orange)_45%,transparent)]",
}

function TrophyMedalMark({
  medal,
  className,
}: {
  medal: TrophyMedal
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex aspect-square w-full max-w-16 items-center justify-center rounded-full ring-2",
        medalSurfaceClassName[medal],
        className
      )}
    >
      <span className="text-sm font-bold tabular-nums tracking-tight lg:text-base">
        {medalOrdinal(medal)}
      </span>
    </div>
  )
}

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
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <TrophyMedalMark medal={title.medal} />
      <p className="w-full truncate text-center text-sm font-medium">
        {title.leagueName}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {title.leagueSize > 0 ? `${title.leagueSize} managers` : medalOrdinal(title.medal)}
      </p>
    </div>
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
