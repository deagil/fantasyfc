import type { MatchEventSection } from "@/lib/fixtures/events"
import { cn } from "@/lib/utils"

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
        <div key={section.identifier} className="rounded-xl bg-foreground/3 p-3">
          <p className="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {section.label}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <ul className="flex flex-col gap-1">
              {section.home.length === 0 ? (
                <li className="text-xs text-muted-foreground">—</li>
              ) : (
                section.home.map((player) => (
                  <li
                    key={`${section.identifier}-h-${player.element}`}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <span className="truncate font-medium">{player.webName}</span>
                    {player.value > 1 ? (
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        ×{player.value}
                      </span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
            <ul className="flex flex-col gap-1 text-right">
              {section.away.length === 0 ? (
                <li className="text-xs text-muted-foreground">—</li>
              ) : (
                section.away.map((player) => (
                  <li
                    key={`${section.identifier}-a-${player.element}`}
                    className="flex items-baseline justify-between gap-2"
                  >
                    {player.value > 1 ? (
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        ×{player.value}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="truncate font-medium">{player.webName}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ))}
    </div>
  )
}
