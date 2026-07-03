import { GameweekTile } from "@/components/gameweek-tile"
import { ComingSoonTile } from "@/components/coming-soon-tile"
import { LeaguesTile } from "@/components/leagues-tile"
import { OverallTile } from "@/components/overall-tile"
import { TransfersTile } from "@/components/transfers-tile"
import { DataTile } from "@/components/tile-group"
import { hubTileGridClassName } from "@/lib/layout"

export function CentralPage() {
  return (
    <div className={hubTileGridClassName}>
      <GameweekTile className="col-span-2 row-span-1 lg:col-start-1 lg:row-start-1" />
      <LeaguesTile className="col-span-2 row-span-2 lg:col-start-3 lg:row-start-1" />
      <OverallTile className="col-span-1 row-span-1 lg:col-start-1 lg:row-start-2" />
      <TransfersTile className="col-span-1 row-span-1 lg:col-start-2 lg:row-start-2" />
      <ComingSoonTile className="col-span-2 row-span-1 lg:col-start-1 lg:row-start-3">
        <DataTile slim comingSoon>
          <DataTile.Header className="p-3 pb-0">
            <DataTile.Heading>
              <DataTile.Label>Placeholder</DataTile.Label>
              <DataTile.Subtitle>Slim layout slot</DataTile.Subtitle>
            </DataTile.Heading>
          </DataTile.Header>
          <DataTile.Content align="center" className="p-3 pt-2">
            <DataTile.EmptyState>Reserved for a future slim tile.</DataTile.EmptyState>
          </DataTile.Content>
        </DataTile>
      </ComingSoonTile>
      <ComingSoonTile className="col-span-1 row-span-1 lg:col-start-3 lg:row-start-3">
        <DataTile comingSoon className="relative">
          <DataTile.Header className="relative z-10">
            <DataTile.Heading>
              <DataTile.Label
                className="text-lg font-semibold"
                style={{ viewTransitionName: "vt-fixtures-title" }}
              >
                Fixtures
              </DataTile.Label>
            </DataTile.Heading>
          </DataTile.Header>
          <img
            src="/images/ref.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 bottom-0 h-[85%] w-auto object-contain object-bottom drop-shadow-lg"
          />
        </DataTile>
      </ComingSoonTile>
      <ComingSoonTile className="col-span-1 row-span-1 lg:col-start-4 lg:row-start-3">
        <DataTile comingSoon className="relative">
          <DataTile.Header className="relative z-10">
            <DataTile.Heading>
              <DataTile.Label
                className="text-lg font-semibold"
                style={{ viewTransitionName: "vt-scouts-title" }}
              >
                Scouts
              </DataTile.Label>
            </DataTile.Heading>
          </DataTile.Header>
          <img
            src="/images/scouts.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 bottom-0 h-[85%] w-auto object-contain object-bottom drop-shadow-lg"
          />
        </DataTile>
      </ComingSoonTile>
    </div>
  )
}
