import { MatchCard, MatchSidesColumns } from "@/components/match-card"
import type { YourPlayerInFixture } from "@/lib/fixtures/live"
import { cn } from "@/lib/utils"

function PlayerSideList({ players }: { players: YourPlayerInFixture[] }) {
  if (players.length === 0) {
    return <p className="text-xs text-muted-foreground">—</p>
  }

  return (
    <ul className="flex flex-col items-center gap-1.5">
      {players.map((player) => (
        <li
          key={player.element}
          className={cn(
            "flex max-w-full items-baseline justify-center gap-1.5 text-sm",
            player.isOnBench && "opacity-60"
          )}
        >
          <span className="min-w-0 truncate font-medium">
            {player.webName}
            {player.pick.is_captain ? (
              <span className="ml-1 text-[10px] font-bold text-pl-pink">(C)</span>
            ) : null}
            {player.pick.is_vice_captain ? (
              <span className="ml-1 text-[10px] font-bold text-muted-foreground">
                (VC)
              </span>
            ) : null}
            {player.isOnBench ? (
              <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                Bench
              </span>
            ) : null}
          </span>
          <span className="shrink-0 font-semibold tabular-nums">
            {player.appliedPoints}
            {player.pick.multiplier > 1 ? (
              <span className="ml-1 text-[10px] text-muted-foreground">
                ({player.points}×{player.pick.multiplier})
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function MatchYourPlayers({
  players,
  className,
}: {
  players: YourPlayerInFixture[]
  className?: string
}) {
  if (players.length === 0) {
    return null
  }

  const home = players.filter((player) => player.side === "h")
  const away = players.filter((player) => player.side === "a")

  return (
    <MatchCard title="Your players" className={className}>
      <MatchSidesColumns
        home={<PlayerSideList players={home} />}
        away={<PlayerSideList players={away} />}
      />
    </MatchCard>
  )
}
