import { DataTile } from "@/components/data-tile"
import { hubTileGridClassName } from "@/lib/layout"
import { cn } from "@/lib/utils"

type TileGroupProps = {
  className?: string
  children: React.ReactNode
}

export function TileGroup({ className, children }: TileGroupProps) {
  return (
    <div className={cn(hubTileGridClassName, "min-w-0 flex-1 content-start", className)}>
      {children}
    </div>
  )
}

type TileProps = {
  wide?: boolean
  slim?: boolean
  className?: string
  children?: React.ReactNode
}

/** @deprecated Use DataTile for new tiles. Kept for empty placeholders. */
export function Tile({ wide = false, slim = false, className, children }: TileProps) {
  return (
    <DataTile wide={wide} slim={slim} className={className}>
      {children}
    </DataTile>
  )
}

export { DataTile } from "@/components/data-tile"
