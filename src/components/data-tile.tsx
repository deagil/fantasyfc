import { ChevronRightIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const dataTileToneVariants = cva("", {
  variants: {
    tone: {
      default: "text-foreground",
      chart1: "text-chart-1",
      chart2: "text-chart-2",
      chart3: "text-chart-3",
      chart4: "text-chart-4",
      chart5: "text-chart-5",
      destructive: "text-destructive",
    },
  },
  defaultVariants: {
    tone: "default",
  },
})

export type DataTileTone = NonNullable<
  VariantProps<typeof dataTileToneVariants>["tone"]
>

export type TileSize = "1x1" | "2x1" | "2x2"

type DataTileProps = {
  size?: TileSize
  /** @deprecated Use `size="2x2"` */
  wide?: boolean
  /** @deprecated Use `size="2x1"` */
  slim?: boolean
  interactive?: boolean
  comingSoon?: boolean
  className?: string
  children?: React.ReactNode
}

function resolveTileSize({
  size,
  wide = false,
  slim = false,
}: Pick<DataTileProps, "size" | "wide" | "slim">): TileSize {
  if (size) {
    return size
  }

  if (slim) {
    return "2x1"
  }

  if (wide) {
    return "2x2"
  }

  return "1x1"
}

const tileSizeClassNames: Record<TileSize, string> = {
  "1x1": "col-span-1 row-span-1",
  "2x1": "col-span-2 row-span-1",
  "2x2": "col-span-2 row-span-2",
}

function DataTileRoot({
  size,
  wide = false,
  slim = false,
  interactive = false,
  comingSoon = false,
  className,
  children,
}: DataTileProps) {
  const resolvedSize = resolveTileSize({ size, wide, slim })

  return (
    <Card
      data-tile
      data-tile-interactive={interactive ? "" : undefined}
      data-coming-soon={comingSoon ? "" : undefined}
      className={cn(
        "h-full min-h-0 gap-0 overflow-hidden rounded-[2px] bg-transparent py-0 text-(--tile-fg) shadow-none ring-0",
        tileSizeClassNames[resolvedSize],
        className
      )}
    >
      {children}
    </Card>
  )
}

function DataTileHeader({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn("flex items-start justify-between gap-2 p-4 pb-0", className)}
    >
      {children}
    </div>
  )
}

function DataTileHeading({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0",
        className
      )}
    >
      {children}
    </div>
  )
}

function DataTileLabel({
  className,
  style,
  children,
}: {
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <p className={cn("text-lg font-semibold text-foreground", className)} style={style}>
      {children}
    </p>
  )
}

function DataTileSubtitle({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <p
      className={cn("text-lg font-semibold text-muted-foreground", className)}
      data-tile-muted
    >
      {children}
    </p>
  )
}

type DataTileActionProps = {
  "aria-label": string
  className?: string
  render?: React.ReactElement
  onClick?: () => void
}

function DataTileAction({
  className,
  render,
  onClick,
  "aria-label": ariaLabel,
}: DataTileActionProps) {
  return (
    <Button
      variant="secondary"
      size="icon-sm"
      data-tile-action
      className={cn("shrink-0 rounded-full", className)}
      aria-label={ariaLabel}
      onClick={onClick}
      render={render}
    >
      <ChevronRightIcon />
    </Button>
  )
}

const dataTileContentVariants = cva("flex flex-1 flex-col p-4 pt-2", {
  variants: {
    align: {
      end: "justify-end",
      center: "justify-center",
      between: "justify-between",
    },
  },
  defaultVariants: {
    align: "end",
  },
})

function DataTileContent({
  className,
  align = "end",
  children,
}: {
  className?: string
  align?: "end" | "center" | "between"
  children: React.ReactNode
}) {
  return (
    <div className={cn(dataTileContentVariants({ align }), className)}>
      {children}
    </div>
  )
}

function DataTileFooter({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn("px-4 pb-4 pt-0", className)}>{children}</div>
}

type DataTileValueProps = {
  value: React.ReactNode
  unit?: React.ReactNode
  tone?: DataTileTone
  className?: string
}

function DataTileValue({
  value,
  unit,
  tone = "default",
  className,
}: DataTileValueProps) {
  return (
    <p
      className={cn(
        "text-4xl font-semibold tabular-nums leading-none",
        dataTileToneVariants({ tone }),
        className
      )}
    >
      {value}
      {unit ? (
        <span className="ml-1 text-2xl font-semibold tabular-nums">{unit}</span>
      ) : null}
    </p>
  )
}

function DataTileHeroStat({
  value,
  caption,
  tone = "default",
  className,
  valueClassName,
  captionClassName,
}: {
  value: React.ReactNode
  caption?: React.ReactNode
  tone?: DataTileTone
  className?: string
  valueClassName?: string
  captionClassName?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center",
        className
      )}
    >
      <DataTileValue
        value={value}
        tone={tone}
        className={cn(
          "text-5xl tracking-tight sm:text-6xl lg:text-5xl xl:text-6xl",
          valueClassName
        )}
      />
      {caption ? (
        <p
          className={cn(
            "text-sm font-medium tabular-nums text-muted-foreground",
            captionClassName
          )}
          data-tile-muted
        >
          {caption}
        </p>
      ) : null}
    </div>
  )
}

function DataTileStats({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>
  )
}

type DataTileStatProps = {
  label: React.ReactNode
  value: React.ReactNode
  tone?: DataTileTone
  className?: string
}

function DataTileStat({
  label,
  value,
  tone = "default",
  className,
}: DataTileStatProps) {
  return (
    <div className={cn("flex items-baseline justify-between gap-2", className)}>
      <span className="text-xs text-muted-foreground" data-tile-muted>
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-medium tabular-nums",
          dataTileToneVariants({ tone })
        )}
      >
        {value}
      </span>
    </div>
  )
}

function DataTileEmptyState({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} data-tile-muted>
      {children}
    </p>
  )
}

const dataTileBarToneVariants = cva("min-h-1 flex-1 rounded-full", {
  variants: {
    tone: {
      default: "bg-foreground/30",
      chart1: "bg-chart-1",
      chart2: "bg-chart-2",
      chart3: "bg-chart-3",
      chart4: "bg-chart-4",
      chart5: "bg-chart-5",
      destructive: "bg-destructive",
    },
  },
  defaultVariants: {
    tone: "chart2",
  },
})

function DataTileChart({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex gap-1.5", className)}>{children}</div>
  )
}

function DataTileChartColumn({
  label,
  className,
  children,
}: {
  label?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col items-center gap-1", className)}>
      <div className="flex h-20 w-full items-end">{children}</div>
      {label ? (
        <span className="text-[10px] tabular-nums text-muted-foreground" data-tile-muted>
          {label}
        </span>
      ) : null}
    </div>
  )
}

type DataTileBarProps = {
  tone?: DataTileTone
  className?: string
  style?: React.CSSProperties
  active?: boolean
}

function DataTileBar({
  tone = "chart2",
  className,
  style,
  active = false,
}: DataTileBarProps) {
  return (
    <div
      className={cn(
        dataTileBarToneVariants({ tone }),
        "w-full rounded-md",
        active && "ring-2 ring-foreground/15 ring-offset-1 ring-offset-transparent",
        className
      )}
      style={style}
    />
  )
}

export const DataTile = Object.assign(DataTileRoot, {
  Header: DataTileHeader,
  Heading: DataTileHeading,
  Label: DataTileLabel,
  Subtitle: DataTileSubtitle,
  Action: DataTileAction,
  Content: DataTileContent,
  Footer: DataTileFooter,
  Value: DataTileValue,
  HeroStat: DataTileHeroStat,
  Stats: DataTileStats,
  Stat: DataTileStat,
  EmptyState: DataTileEmptyState,
  Chart: DataTileChart,
  ChartColumn: DataTileChartColumn,
  Bar: DataTileBar,
})

export type { DataTileProps, DataTileActionProps, DataTileValueProps }
