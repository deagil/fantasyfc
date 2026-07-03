import { Skeleton } from "@/components/ui/skeleton"
import { DataTile } from "@/components/data-tile"
import { formatOverallRank } from "@/lib/fpl/history"
import { useTeam } from "@/lib/fpl/team-context"

export function OverallTile({
  className,
  comingSoon = false,
}: {
  className?: string
  comingSoon?: boolean
}) {
  const { entry, isLoggedIn, isLoading, error } = useTeam()

  const title = entry?.name ?? "Your team"

  return (
    <DataTile className={className} comingSoon={comingSoon}>
      <DataTile.Header>
        <DataTile.Heading>
          {isLoading && isLoggedIn && !entry ? (
            <Skeleton className="h-4 w-28" />
          ) : (
            <DataTile.Label>{title}</DataTile.Label>
          )}
        </DataTile.Heading>
      </DataTile.Header>

      <DataTile.Content align="center" className="min-h-0 flex-1 justify-center pt-0">
        {!isLoggedIn ? (
          <DataTile.EmptyState>Connect a team</DataTile.EmptyState>
        ) : isLoading && !entry ? (
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-14 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ) : error && !entry ? (
          <DataTile.EmptyState className="text-destructive">—</DataTile.EmptyState>
        ) : entry ? (
          <DataTile.HeroStat
            value={formatOverallRank(entry.summary_overall_rank)}
            caption={`${entry.summary_overall_points.toLocaleString()} pts`}
          />
        ) : null}
      </DataTile.Content>
    </DataTile>
  )
}
