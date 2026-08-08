import { DataTile } from "@/components/data-tile"
import {
  BAND_TEXT,
  MetricBandLegend,
  MetricRangeBar,
} from "@/components/metric-range-bar"
import { SeasonPointsChart } from "@/components/season-points-chart"
import { Skeleton } from "@/components/ui/skeleton"
import {
  describeFixtureRunDifficulty,
  type FixtureRun,
} from "@/lib/fixtures/upcoming"
import type { PlayerSeasonHistoryEntry } from "@/lib/ratings/model"
import { METRIC_BAND_LABELS } from "@/lib/scouts/summary"
import type {
  ScoutSummary,
  SummaryAvailability,
  SummaryMetric,
  SummaryTone,
} from "@/lib/scouts/summary"
import { cn } from "@/lib/utils"

// The pl-* brand palette is tuned for fills, not small text on white; the
// rating tokens are the scheme-aware pair that stays legible at this size.
const TONE_TEXT: Record<SummaryTone, string> = {
  positive: "text-rating-good",
  neutral: "text-foreground",
  negative: "text-rating-bad",
}

const TONE_BAR: Record<SummaryTone, string> = {
  positive: "bg-rating-good",
  neutral: "bg-foreground/40",
  negative: "bg-rating-bad",
}

function difficultyClassName(difficulty: number): string {
  const clamped = Math.min(5, Math.max(1, Math.round(difficulty)))
  if (clamped <= 2) {
    return "bg-rating-good/15 text-rating-good"
  }
  if (clamped === 3) {
    return "bg-foreground/8 text-foreground"
  }
  return "bg-rating-bad/15 text-rating-bad"
}

export function AvailabilityBanner({
  availability,
  className,
}: {
  availability: SummaryAvailability
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2",
        availability.tone === "negative" ? "bg-rating-bad/10" : "bg-foreground/5",
        className
      )}
    >
      <p className={cn("text-sm font-semibold", TONE_TEXT[availability.tone])}>
        {availability.label}
      </p>
      {availability.note ? (
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
          {availability.note}
        </p>
      ) : null}
    </div>
  )
}

function MetricRow({ metric }: { metric: SummaryMetric }) {
  const bandId = metric.range?.bandId

  return (
    <li className="rounded-lg bg-background/70 px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex min-w-0 items-baseline gap-1.5 text-xs font-semibold uppercase tracking-wide">
          <span className="text-muted-foreground">{metric.label}</span>
          {bandId ? (
            <span className={cn("truncate", BAND_TEXT[bandId])}>
              {METRIC_BAND_LABELS[bandId]}
            </span>
          ) : null}
        </p>

        <p
          className={cn(
            "shrink-0 text-sm font-semibold tabular-nums",
            bandId ? BAND_TEXT[bandId] : TONE_TEXT[metric.tone]
          )}
        >
          {metric.value}
        </p>
      </div>

      {metric.range ? (
        <MetricRangeBar range={metric.range} className="mt-2" />
      ) : metric.percentile !== null ? (
        <span
          className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-foreground/10"
          role="presentation"
        >
          <span
            className={cn("block h-full rounded-full", TONE_BAR[metric.tone])}
            style={{ width: `${Math.min(100, Math.max(2, metric.percentile))}%` }}
          />
        </span>
      ) : null}

      {metric.detail ? (
        <p className="mt-1.5 text-sm text-muted-foreground">{metric.detail}</p>
      ) : null}
    </li>
  )
}

function FixtureStrip({ fixtures }: { fixtures: FixtureRun }) {
  const footnoteParts: string[] = []
  if (fixtures.doubleCount > 0) {
    footnoteParts.push(
      `${fixtures.doubleCount} double gameweek${fixtures.doubleCount > 1 ? "s" : ""}`
    )
  }
  if (fixtures.blankCount > 0) {
    footnoteParts.push(
      `${fixtures.blankCount} blank${fixtures.blankCount > 1 ? "s" : ""}`
    )
  }

  const runDifficulty =
    fixtures.averageDifficulty === null
      ? null
      : describeFixtureRunDifficulty(fixtures.averageDifficulty)

  let runDifficultyClass = "text-muted-foreground"
  if (runDifficulty === "easier") {
    runDifficultyClass = "text-rating-good"
  } else if (runDifficulty === "harder") {
    runDifficultyClass = "text-rating-bad"
  } else if (runDifficulty === "average") {
    runDifficultyClass = "text-muted-foreground"
  } else if (runDifficulty !== null) {
    const _exhaustive: never = runDifficulty
    void _exhaustive
  }

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Next {fixtures.events.length} gameweeks
        </p>
        {runDifficulty ? (
          <p className={cn("text-xs font-semibold capitalize", runDifficultyClass)}>
            {runDifficulty}
          </p>
        ) : null}
      </div>

      <ul className="mt-2 grid grid-flow-col auto-cols-fr gap-1.5">
        {fixtures.events.map((event) => (
          <li key={event.event} className="min-w-0">
            <p className="mb-1 text-center text-[0.625rem] font-medium uppercase text-muted-foreground">
              GW{event.event}
            </p>
            {event.fixtures.length === 0 ? (
              <div className="rounded-md bg-foreground/5 px-1 py-1.5 text-center text-xs font-semibold text-muted-foreground">
                —
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {event.fixtures.map((fixture) => (
                  <div
                    key={fixture.fixtureId}
                    className={cn(
                      "truncate rounded-md px-1 py-1.5 text-center text-xs font-semibold",
                      difficultyClassName(fixture.difficulty)
                    )}
                    title={`${fixture.opponentShort} ${fixture.isHome ? "(H)" : "(A)"} · FDR ${fixture.difficulty}`}
                  >
                    {fixture.opponentShort.toUpperCase()}{" "}
                    {fixture.isHome ? "(H)" : "(A)"}
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {footnoteParts.length > 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {footnoteParts.join(" · ")}.
        </p>
      ) : null}
    </div>
  )
}

function SeasonHistory({ history }: { history: PlayerSeasonHistoryEntry[] }) {
  return (
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Points by season
      </p>
      <SeasonPointsChart history={history} />
    </div>
  )
}

type ScoutSummaryPanelProps = {
  summary: ScoutSummary | null
  isLoading: boolean
  className?: string
  /** When true, the availability banner is rendered by the parent instead. */
  hideAvailability?: boolean
}

export function ScoutSummaryPanel({
  summary,
  isLoading,
  className,
  hideAvailability = false,
}: ScoutSummaryPanelProps) {
  if (isLoading || !summary) {
    return <Skeleton className={cn("h-64 rounded-xl", className)} />
  }

  return (
    <div className={cn("rounded-xl bg-muted/40 p-4", className)}>
      <DataTile.Label className="text-sm">Scout summary</DataTile.Label>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {summary.headline}
      </p>

      {!hideAvailability && summary.availability ? (
        <AvailabilityBanner
          availability={summary.availability}
          className="mt-3"
        />
      ) : null}

      <ul className="mt-3 space-y-1.5">
        {summary.metrics.map((metric) => (
          <MetricRow key={metric.id} metric={metric} />
        ))}
      </ul>

      {summary.metrics.some((metric) => metric.range) ? (
        <MetricBandLegend caption={summary.cohortCaption} />
      ) : null}

      {summary.fixtures && summary.fixtures.events.length > 0 ? (
        <FixtureStrip fixtures={summary.fixtures} />
      ) : null}

      {summary.history.length > 0 ? (
        <SeasonHistory history={summary.history} />
      ) : null}
    </div>
  )
}
