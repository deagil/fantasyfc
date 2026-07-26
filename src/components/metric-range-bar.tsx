import {
  METRIC_BAND_LABELS,
  METRIC_BAND_ORDER,
  formatRangeValue,
} from "@/lib/scouts/summary"
import type { MetricBandId, MetricRange } from "@/lib/scouts/summary"
import { cn } from "@/lib/utils"

export const BAND_FILL: Record<MetricBandId, string> = {
  poor: "bg-rating-bad",
  typical: "bg-rating-fair",
  strong: "bg-rating-good",
  elite: "bg-rating-elite",
}

export const BAND_TEXT: Record<MetricBandId, string> = {
  poor: "text-rating-bad",
  typical: "text-rating-fair",
  strong: "text-rating-good",
  elite: "text-rating-elite",
}

/**
 * Where a player sits among their position cohort, split into quartiles. Each
 * band is a quarter of the bar and a quarter of the players, so the marker
 * position reads directly as "how much of the field he is ahead of", and the
 * boundary values say what each verdict is worth in real units.
 */
export function MetricRangeBar({
  range,
  className,
}: {
  range: MetricRange
  className?: string
}) {
  const format = (value: number) => formatRangeValue(value, range.decimals)
  const markerLeft = Math.min(100, Math.max(0, range.valuePercentile))

  return (
    <div className={cn("min-w-0", className)}>
      <div className="relative h-1.5">
        <div className="flex h-full overflow-hidden rounded-full">
          {METRIC_BAND_ORDER.map((band) => (
            <span key={band} className={cn("flex-1", BAND_FILL[band])} />
          ))}
        </div>
        <span
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-sm"
          style={{ left: `${markerLeft}%` }}
        />
      </div>

      <div className="relative mt-1.5 h-3.5">
        {range.boundaries.map((boundary, index) => (
          <span
            key={index}
            className="absolute -translate-x-1/2 text-[0.625rem] tabular-nums text-muted-foreground"
            style={{ left: `${(index + 1) * 25}%` }}
          >
            {format(boundary)}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Explains the band colours once, rather than on every metric row. */
export function MetricBandLegend({ caption }: { caption: string }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5">
      {METRIC_BAND_ORDER.map((band) => (
        <span
          key={band}
          className="inline-flex items-center gap-1.5 text-[0.625rem] text-muted-foreground"
        >
          <span className={cn("size-1.5 rounded-full", BAND_FILL[band])} />
          {METRIC_BAND_LABELS[band]}
        </span>
      ))}
      <span className="text-[0.625rem] text-muted-foreground/70">{caption}</span>
    </div>
  )
}
