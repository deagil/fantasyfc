import type { YourPlayerInFixture } from "@/lib/fixtures/live"
import { cn } from "@/lib/utils"

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

  return (
    <div className={cn("rounded-xl bg-foreground/3 p-3", className)}>
      <p className="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        Your players
      </p>
      <ul className="flex flex-col gap-1.5">
        {players.map((player) => (
          <li
            key={player.element}
            className={cn(
              "flex items-center gap-2 text-sm",
              player.isOnBench && "opacity-60"
            )}
          >
            <span className="min-w-0 flex-1 truncate font-medium">
              {player.webName}
              {player.pick.is_captain ? (
                <span className="ml-1 text-[10px] font-bold text-pl-pink">
                  (C)
                </span>
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
    </div>
  )
}
