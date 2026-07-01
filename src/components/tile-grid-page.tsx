import { Tile, TileGroup } from "@/components/tile-group"

export function TileGridPage() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <TileGroup>
        <Tile wide />
        <Tile />
        <Tile />
      </TileGroup>
      <TileGroup>
        <Tile wide />
        <Tile />
        <Tile />
      </TileGroup>
    </div>
  )
}
