import { GameweekTile } from "@/components/gameweek-tile"
import { ComingSoonTile } from "@/components/coming-soon-tile"
import { LeaguesTile } from "@/components/leagues-tile"
import { NewsTile } from "@/components/news-tile"
import { NowPlayingTile } from "@/components/now-playing-tile"
import { OverallTile } from "@/components/overall-tile"
import { TransfersTile } from "@/components/transfers-tile"
import { DataTile } from "@/components/tile-group"
import { hubTileGridClassName } from "@/lib/layout"
import { LeaguesInspectorProvider } from "@/lib/fpl/leagues-inspector-context"

export function CentralPage() {
  return (
    <LeaguesInspectorProvider>
      <div className={hubTileGridClassName}>
        <GameweekTile className="col-span-2 row-span-1 lg:col-start-1 lg:row-start-1" />
        <LeaguesTile className="col-span-2 row-span-2 lg:col-start-3 lg:row-start-1" />
        <OverallTile className="col-span-1 row-span-1 lg:col-start-1 lg:row-start-2" />
        <TransfersTile className="col-span-1 row-span-1 lg:col-start-2 lg:row-start-2" />
        <NewsTile className="col-span-2 row-span-1 lg:col-start-1 lg:row-start-3" />
        <ComingSoonTile className="col-span-1 row-span-1 lg:col-start-3 lg:row-start-3">
          <DataTile comingSoon className="relative">
            <DataTile.Header className="relative z-10">
              <DataTile.Heading>
                <DataTile.Label style={{ viewTransitionName: "vt-scouts-title" }}>
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
        <NowPlayingTile className="col-span-1 row-span-1 lg:col-start-4 lg:row-start-3" />
      </div>
    </LeaguesInspectorProvider>
  )
}
