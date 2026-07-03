import { Skeleton } from "@/components/ui/skeleton"
import { DataTile } from "@/components/data-tile"
import {
  formatBankBalance,
  formatFreeTransfers,
  getPublicTransferSummary,
} from "@/lib/fpl/transfers"
import { useTeam } from "@/lib/fpl/team-context"

export function TransfersTile({
  className,
  comingSoon = false,
}: {
  className?: string
  comingSoon?: boolean
}) {
  const { entry, history, isLoggedIn, isLoading, error } = useTeam()
  const transfers =
    entry && history ? getPublicTransferSummary(entry, history) : null

  return (
    <DataTile className={className} comingSoon={comingSoon}>
      <DataTile.Header>
        <DataTile.Heading>
          <DataTile.Label>Transfer Hub</DataTile.Label>
        </DataTile.Heading>
      </DataTile.Header>

      <DataTile.Content align="center" className="min-h-0 flex-1 justify-center pt-0">
        {!isLoggedIn ? (
          <DataTile.EmptyState>Connect a team</DataTile.EmptyState>
        ) : isLoading && !entry ? (
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-14 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : error && !entry ? (
          <DataTile.EmptyState className="text-destructive">—</DataTile.EmptyState>
        ) : transfers ? (
          <DataTile.HeroStat
            value={formatBankBalance(transfers.bank)}
            caption={formatFreeTransfers(transfers.freeTransfers)}
          />
        ) : null}
      </DataTile.Content>
    </DataTile>
  )
}
