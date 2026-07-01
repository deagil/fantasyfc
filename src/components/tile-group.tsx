import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type TileGroupProps = {
  className?: string
  children: React.ReactNode
}

export function TileGroup({ className, children }: TileGroupProps) {
  return (
    <div className={cn("grid min-w-0 flex-1 grid-cols-2 gap-4", className)}>
      {children}
    </div>
  )
}

type TileProps = {
  wide?: boolean
  className?: string
  children?: React.ReactNode
}

export function Tile({ wide = false, className, children }: TileProps) {
  return (
    <Card
      className={cn(
        "aspect-video items-center justify-center bg-muted/50 py-0 shadow-none ring-0",
        wide && "col-span-2",
        className
      )}
    >
      {children}
    </Card>
  )
}
