import { ComingSoonTile } from "@/components/coming-soon-tile"
import { ScoutTile } from "@/components/scout-tile"
import { TransfersTile } from "@/components/transfers-tile"
import { DataTile } from "@/components/data-tile"
import { hubTileGridClassName } from "@/lib/layout"
import {
  getFeaturedScoutPreset,
  getSecondaryScoutPresets,
} from "@/lib/scouts/presets"
import { cn } from "@/lib/utils"

const secondaryScoutPresets = getSecondaryScoutPresets()
const featuredScoutPreset = getFeaturedScoutPreset()

export function TransfersHubPage() {
  return (
    <div className={hubTileGridClassName}>
      <ScoutTile
        scout={featuredScoutPreset}
        className="col-span-2 row-span-2 lg:col-start-1 lg:row-start-1"
        titleStyle={{ viewTransitionName: "vt-scouts-title" }}
      />

      <TransfersTile className="col-span-1 row-span-1 lg:col-start-3 lg:row-start-1" />

      <ComingSoonTile className="col-span-1 row-span-1 lg:col-start-4 lg:row-start-1">
        <DataTile comingSoon className="relative h-full">
          <DataTile.Header>
            <DataTile.Heading>
              <DataTile.Label>Search players</DataTile.Label>
            </DataTile.Heading>
          </DataTile.Header>
          <DataTile.Content align="center" className="min-h-0 flex-1 justify-center pt-0">
            <DataTile.EmptyState>Find a specific target</DataTile.EmptyState>
          </DataTile.Content>
        </DataTile>
      </ComingSoonTile>

      {secondaryScoutPresets.slice(0, 2).map((scout, index) => (
        <ScoutTile
          key={scout.slug}
          scout={scout}
          className={cn(
            "col-span-1 row-span-1",
            index === 0 ? "lg:col-start-3 lg:row-start-2" : "lg:col-start-4 lg:row-start-2"
          )}
        />
      ))}

      <ComingSoonTile className="col-span-2 row-span-1 lg:col-start-1 lg:row-start-3">
        <DataTile size="2x1" comingSoon className="h-full">
          <DataTile.Header>
            <DataTile.Heading>
              <DataTile.Label>Transfer history</DataTile.Label>
            </DataTile.Heading>
          </DataTile.Header>
          <DataTile.Content align="center" className="min-h-0 flex-1 justify-center pt-0">
            <DataTile.EmptyState>Season moves and fees</DataTile.EmptyState>
          </DataTile.Content>
        </DataTile>
      </ComingSoonTile>

      {secondaryScoutPresets.slice(2).map((scout, index) => (
        <ScoutTile
          key={scout.slug}
          scout={scout}
          className={cn(
            "col-span-1 row-span-1",
            index === 0 ? "lg:col-start-3 lg:row-start-3" : "lg:col-start-4 lg:row-start-3"
          )}
        />
      ))}
    </div>
  )
}
