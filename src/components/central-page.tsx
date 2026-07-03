import { Link } from "@tanstack/react-router"

import { GameweekTile } from "@/components/gameweek-tile"
import { LeaguesTile } from "@/components/leagues-tile"
import { OverallTile } from "@/components/overall-tile"
import { TransfersTile } from "@/components/transfers-tile"
import { DataTile } from "@/components/tile-group"
import { hubTileGridClassName } from "@/lib/layout"

export function CentralPage() {
  return (
    <div className={hubTileGridClassName}>
      <GameweekTile className="lg:col-start-1 lg:row-start-1" />
      <LeaguesTile className="lg:col-start-3 lg:row-start-1" />
      <OverallTile className="lg:col-start-1 lg:row-start-2" />
      <TransfersTile className="lg:col-start-2 lg:row-start-2" />
      <DataTile slim className="lg:col-start-1 lg:row-start-3">
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
      <Link
        to="/fixtures"
        className="contents group/tile transition-transform active:scale-[0.98] lg:col-start-3 lg:row-start-3"
      >
        <DataTile className="relative">
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
      </Link>
      <Link
        to="/scouts"
        className="contents group/tile transition-transform active:scale-[0.98] lg:col-start-4 lg:row-start-3"
      >
        <DataTile className="relative">
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
      </Link>
    </div>
  )
}
