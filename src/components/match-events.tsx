import { MatchCard, MatchSidesColumns } from "@/components/match-card"
import type { MatchEventPlayer, MatchEventSection } from "@/lib/fixtures/events"
import { cn } from "@/lib/utils"

function EventSideList({ players }: { players: MatchEventPlayer[] }) {
  if (players.length === 0) {
    return <p className="text-xs text-muted-foreground">—</p>
  }

  return (
    <ul className="flex flex-col items-center gap-1">
      {players.map((player) => (
        <li
          key={`${player.side}-${player.element}`}
          className="flex max-w-full items-baseline justify-center gap-1 text-sm"
        >
          <span className="truncate font-medium">{player.webName}</span>
          {player.value > 1 ? (
            <span className="shrink-0 tabular-nums text-muted-foreground">
              ×{player.value}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function MatchEvents({
  sections,
  className,
}: {
  sections: MatchEventSection[]
  className?: string
}) {
  if (sections.length === 0) {
    return null
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {sections.map((section) => (
        <MatchCard key={section.identifier} title={section.label}>
          <MatchSidesColumns
            home={<EventSideList players={section.home} />}
            away={<EventSideList players={section.away} />}
          />
        </MatchCard>
      ))}
    </div>
  )
}
