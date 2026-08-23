import { MatchCard, MatchSidesColumns } from "@/components/match-card"
import type { BpsRow, MatchEventPlayer } from "@/lib/fixtures/events"
import { cn } from "@/lib/utils"

function medalClass(index: number): string {
  if (index === 0) {
    return "rounded-full bg-pl-yellow text-[10px] font-bold leading-5 text-black"
  }
  if (index === 1) {
    return "text-muted-foreground"
  }
  if (index === 2) {
    return "text-pl-orange"
  }
  return "text-muted-foreground"
}

export function MatchBpsTable({
  rows,
  title = "BPS",
  showProjectedBonus = false,
  className,
}: {
  rows: BpsRow[]
  title?: string
  showProjectedBonus?: boolean
  className?: string
}) {
  if (rows.length === 0) {
    return null
  }

  return (
    <MatchCard title={title} className={className}>
      <ul className="flex flex-col gap-1.5 px-3">
        {rows.map((row, index) => (
          <li key={row.element} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "w-5 shrink-0 text-center text-xs font-semibold tabular-nums",
                medalClass(index)
              )}
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">
              {row.webName}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {row.bps} BPS
            </span>
            {showProjectedBonus && row.projectedBonus > 0 ? (
              <span className="shrink-0 rounded-full bg-pl-yellow px-1.5 text-[10px] font-bold text-black">
                +{row.projectedBonus}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </MatchCard>
  )
}

function BonusSideList({ players }: { players: MatchEventPlayer[] }) {
  if (players.length === 0) {
    return <p className="text-xs text-muted-foreground">—</p>
  }

  return (
    <ul className="flex flex-col items-center gap-1.5">
      {players.map((player) => (
        <li
          key={`${player.side}-${player.element}`}
          className="flex max-w-full items-baseline justify-center gap-1.5 text-sm"
        >
          <span className="truncate font-medium">{player.webName}</span>
          <span className="shrink-0 font-semibold tabular-nums text-foreground">
            +{player.value}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function MatchBonusList({
  players,
  provisional,
  className,
}: {
  players: MatchEventPlayer[]
  provisional: boolean
  className?: string
}) {
  if (players.length === 0) {
    return null
  }

  return (
    <MatchCard
      title={provisional ? "Bonus (provisional)" : "Bonus awarded"}
      className={className}
    >
      <MatchSidesColumns
        home={<BonusSideList players={players.filter((player) => player.side === "h")} />}
        away={<BonusSideList players={players.filter((player) => player.side === "a")} />}
      />
    </MatchCard>
  )
}
