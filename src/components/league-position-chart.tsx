import { useLayoutEffect, useMemo, useRef, useState } from "react"

import { DataTile } from "@/components/data-tile"
import { ScrollFade } from "@/components/scroll-fade"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getChartAxisPositions,
  LEAGUE_RANK_HISTORY_TOP,
} from "@/lib/fpl/league-rank-history"
import type { LeagueRankHistory } from "@/lib/fpl/types"
import { cn } from "@/lib/utils"

const CHART_COLORS = [
  "var(--pl-blue)",
  "var(--pl-green)",
  "var(--pl-pink)",
  "var(--pl-violet)",
  "var(--pl-orange)",
  "var(--pl-purple)",
  "var(--pl-yellow)",
  "var(--pl-plum)",
  "#7c5cbf",
  "#00c2a8",
] as const

const CHART_TOP = 28
const CHART_BOTTOM = 12
const PLOT_LEFT = 22
const PLOT_RIGHT = 4

/** Matches the original top-10 chart density (280px plot / 9 steps). */
const RANK_ROW_HEIGHT = 280 / 9

type ChartLayout = {
  width: number
  axisPositions: number
  chartHeight: number
}

type ChartPoint = {
  x: number
  y: number
  event: number
  rank: number
}

type ChartSeries = {
  entry: number
  name: string
  color: string
  isCurrentTeam: boolean
  points: ChartPoint[]
  paths: string[]
  latestVisiblePoint: ChartPoint
  finalPoint: ChartPoint
}

function getChartHeight(axisPositions: number): number {
  return (
    CHART_TOP +
    CHART_BOTTOM +
    Math.max(axisPositions - 1, 0) * RANK_ROW_HEIGHT
  )
}

function rankToY(rank: number, axisPositions: number): number {
  const displayRank = Math.min(Math.max(Math.round(rank), 1), axisPositions)
  return CHART_TOP + (displayRank - 1) * RANK_ROW_HEIGHT
}

function getPlotBounds(layout: ChartLayout) {
  return {
    left: PLOT_LEFT,
    right: layout.width - PLOT_RIGHT,
    width: layout.width - PLOT_LEFT - PLOT_RIGHT,
  }
}

function truncateLabel(value: string, maxLength = 12): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}…`
}

function shouldShowRankLabel(rank: number, axisPositions: number): boolean {
  if (axisPositions <= 10) {
    return true
  }

  return rank === 1 || rank === axisPositions || rank % 5 === 0
}

function buildChartLayout(
  width: number,
  history: LeagueRankHistory
): ChartLayout {
  const axisPositions = getChartAxisPositions(history)

  return {
    width: Math.max(width, 280),
    axisPositions,
    chartHeight: getChartHeight(axisPositions),
  }
}

function buildChartSeries(
  history: LeagueRankHistory,
  layout: ChartLayout
): ChartSeries[] {
  const plot = getPlotBounds(layout)
  const weekCount = Math.max(history.gameweeks.length - 1, 1)

  return history.series.flatMap((teamSeries, index) => {
    const points = teamSeries.points.map((point, pointIndex) => ({
      x: plot.left + (pointIndex / weekCount) * plot.width,
      y: rankToY(point.rank, layout.axisPositions),
      event: point.event,
      rank: point.rank,
    }))
    const visiblePoints = points.filter(
      (point) => point.rank <= layout.axisPositions
    )

    if (visiblePoints.length === 0) {
      return []
    }

    const paths: string[] = []
    let currentPath: ChartPoint[] = []

    for (const point of points) {
      if (point.rank > layout.axisPositions) {
        if (currentPath.length > 1) {
          paths.push(
            currentPath
              .map(
                (pathPoint, pathPointIndex) =>
                  `${pathPointIndex === 0 ? "M" : "L"} ${pathPoint.x} ${pathPoint.y}`
              )
              .join(" ")
          )
        }
        if (currentPath.length > 0) {
          currentPath = []
        }
        continue
      }

      currentPath.push(point)
    }

    if (currentPath.length > 1) {
      paths.push(
        currentPath
          .map(
            (pathPoint, pathPointIndex) =>
              `${pathPointIndex === 0 ? "M" : "L"} ${pathPoint.x} ${pathPoint.y}`
          )
          .join(" ")
      )
    }

    if (paths.length === 0) {
      return []
    }

    return {
      entry: teamSeries.entry,
      name: teamSeries.name,
      color: CHART_COLORS[index % CHART_COLORS.length]!,
      isCurrentTeam: teamSeries.isCurrentTeam,
      points,
      paths,
      latestVisiblePoint: visiblePoints.at(-1)!,
      finalPoint: points.at(-1)!,
    }
  })
}

function LeaguePositionChartSvg({
  history,
  highlightedEntry,
  onHighlightEntry,
}: {
  history: LeagueRankHistory
  highlightedEntry: number | null
  onHighlightEntry: (entry: number | null) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }

    const updateWidth = () => {
      setWidth(element.clientWidth)
    }

    updateWidth()

    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const layout = useMemo(
    () => buildChartLayout(width, history),
    [width, history]
  )
  const series = useMemo(
    () => buildChartSeries(history, layout),
    [history, layout]
  )
  const plot = getPlotBounds(layout)
  const weekCount = Math.max(history.gameweeks.length - 1, 1)
  const isScrollable = layout.axisPositions > 12

  if (width === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: layout.chartHeight }}
      />
    )
  }

  const chart = (
    <svg
      width={layout.width}
      height={layout.chartHeight}
      viewBox={`0 0 ${layout.width} ${layout.chartHeight}`}
      className="block shrink-0"
      role="img"
      aria-label={`Top ${layout.axisPositions} league position changes over recent gameweeks`}
    >
      {Array.from({ length: layout.axisPositions }, (_, index) => {
        const rank = index + 1
        const y = rankToY(rank, layout.axisPositions)

        return (
          <g key={rank}>
            <line
              x1={plot.left}
              x2={plot.right}
              y1={y}
              y2={y}
              className="stroke-foreground/8"
              strokeWidth={1}
            />
            {shouldShowRankLabel(rank, layout.axisPositions) ? (
              <text
                x={plot.left - 6}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {rank}
              </text>
            ) : null}
          </g>
        )
      })}

      {history.gameweeks.map((event, index) => {
        const x = plot.left + (index / weekCount) * plot.width

        return (
          <g key={event}>
            <line
              x1={x}
              x2={x}
              y1={CHART_TOP}
              y2={layout.chartHeight - CHART_BOTTOM}
              className="stroke-foreground/6"
              strokeWidth={1}
            />
            <text
              x={x}
              y={16}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px] tabular-nums"
            >
              {event}
            </text>
          </g>
        )
      })}

      {series.map((teamSeries) => {
        const isActive =
          highlightedEntry === null || highlightedEntry === teamSeries.entry
        const isHighlighted = highlightedEntry === teamSeries.entry
        const showLabel = isHighlighted || teamSeries.isCurrentTeam
        const finalPointVisible =
          teamSeries.finalPoint.rank <= layout.axisPositions
        const labelPoint = finalPointVisible
          ? teamSeries.finalPoint
          : teamSeries.latestVisiblePoint

        return (
          <g
            key={teamSeries.entry}
            className="cursor-pointer"
            onMouseEnter={() => onHighlightEntry(teamSeries.entry)}
            onMouseLeave={() => onHighlightEntry(null)}
            onFocus={() => onHighlightEntry(teamSeries.entry)}
            onBlur={() => onHighlightEntry(null)}
          >
            {teamSeries.paths.map((path) => (
              <path
                key={path}
                d={path}
                fill="none"
                stroke={teamSeries.color}
                strokeWidth={isHighlighted ? 3 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isActive ? 1 : 0.12}
              />
            ))}
            {finalPointVisible ? (
              <circle
                cx={teamSeries.finalPoint.x}
                cy={teamSeries.finalPoint.y}
                r={isHighlighted ? 4.5 : 3.5}
                fill={teamSeries.color}
                opacity={isActive ? 1 : 0.12}
              />
            ) : null}
            {showLabel ? (
              <text
                x={plot.right + 4}
                y={labelPoint.y + 4}
                className={cn(
                  "text-[10px] font-medium",
                  teamSeries.isCurrentTeam
                    ? "fill-foreground"
                    : "fill-muted-foreground"
                )}
                opacity={isActive ? 1 : 0.2}
              >
                {truncateLabel(teamSeries.name)}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )

  return (
    <div ref={containerRef} className="w-full">
      {isScrollable ? chart : <div className="h-full">{chart}</div>}
    </div>
  )
}

export function LeaguePositionChart({
  history,
  weeks,
  isLoading,
  error,
}: {
  history: LeagueRankHistory | undefined
  weeks: number
  isLoading: boolean
  error: string | null
}) {
  const [highlightedEntry, setHighlightedEntry] = useState<number | null>(null)
  const axisPositions = history ? getChartAxisPositions(history) : LEAGUE_RANK_HISTORY_TOP
  const isScrollable = axisPositions > 12

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3 px-3 pb-3 lg:px-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="min-h-0 flex-1 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <DataTile.EmptyState className="px-3 text-destructive lg:px-4">
        {error}
      </DataTile.EmptyState>
    )
  }

  if (!history || history.gameweeks.length < 2 || history.series.length === 0) {
    return (
      <DataTile.EmptyState className="px-3 lg:px-4">
        Not enough gameweek history yet.
      </DataTile.EmptyState>
    )
  }

  const chart = (
    <LeaguePositionChartSvg
      history={history}
      highlightedEntry={highlightedEntry}
      onHighlightEntry={setHighlightedEntry}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-3 pt-1 lg:px-4">
        <p className="text-[11px] text-muted-foreground">
          Top {axisPositions} · last {weeks} gameweeks · hover to highlight
        </p>
      </div>
      {isScrollable ? (
        <ScrollFade
          className="min-h-0 flex-1 overflow-hidden"
          contentClassName="px-1 pb-2"
          orientation="vertical"
        >
          {chart}
        </ScrollFade>
      ) : (
        <div className="min-h-0 flex-1 px-1 pb-2">{chart}</div>
      )}
    </div>
  )
}
