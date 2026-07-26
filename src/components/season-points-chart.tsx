import { CartesianGrid, LabelList, Line, LineChart, XAxis } from "recharts"

import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import type { PlayerSeasonHistoryEntry } from "@/lib/ratings/model"

const chartConfig = {
  points: {
    label: "Points",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

/** "2025/26" → "25/26" — the century is dead weight on a crowded axis. */
function shortSeason(seasonName: string): string {
  return seasonName.length === 7 ? seasonName.slice(2) : seasonName
}

type SeasonDatum = {
  season: string
  points: number
  minutes: number
  goals: number
  assists: number
  pointsPerMillion: number | null
}

function SeasonTooltip({ datum }: { datum: SeasonDatum }) {
  return (
    <div className="grid gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium text-foreground">{datum.season}</p>
      <p className="tabular-nums text-muted-foreground">
        {datum.points} points · {datum.minutes.toLocaleString()} mins
      </p>
      <p className="tabular-nums text-muted-foreground">
        {datum.goals}G {datum.assists}A
        {datum.pointsPerMillion === null
          ? ""
          : ` · ${datum.pointsPerMillion.toFixed(1)} pts/£m`}
      </p>
    </div>
  )
}

/**
 * Season points as a line rather than bars — the shape of a career (rising,
 * flat, or a one-off spike) is the thing worth reading at a glance.
 */
export function SeasonPointsChart({
  history,
}: {
  history: PlayerSeasonHistoryEntry[]
}) {
  const data: SeasonDatum[] = history.map((season) => ({
    season: shortSeason(season.seasonName),
    points: season.totalPoints,
    minutes: season.minutes,
    goals: season.goalsScored,
    assists: season.assists,
    pointsPerMillion: season.pointsPerMillion,
  }))

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-36 w-full"
      initialDimension={{ width: 320, height: 144 }}
    >
      <LineChart
        accessibilityLayer
        data={data}
        margin={{ top: 20, left: 12, right: 12 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="season"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) =>
            active && payload.length > 0 ? (
              <SeasonTooltip datum={payload[0].payload as SeasonDatum} />
            ) : null
          }
        />
        <Line
          dataKey="points"
          type="natural"
          stroke="var(--color-points)"
          strokeWidth={2}
          dot={{
            fill: "var(--color-points)",
          }}
          activeDot={{
            r: 6,
          }}
        >
          <LabelList
            position="top"
            offset={12}
            className="fill-foreground"
            fontSize={12}
          />
        </Line>
      </LineChart>
    </ChartContainer>
  )
}
