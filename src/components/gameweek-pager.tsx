import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { GameweekShape } from "@/lib/fixtures/gameweek-shape"
import type { FplEvent } from "@/lib/fpl/types"
import { cn } from "@/lib/utils"

export function GameweekPager({
  events,
  selectedEventId,
  shapes,
  onSelect,
  className,
}: {
  events: readonly FplEvent[]
  selectedEventId: number
  shapes: Map<number, GameweekShape>
  onSelect: (eventId: number) => void
  className?: string
}) {
  const selectedIndex = events.findIndex((event) => event.id === selectedEventId)
  const currentEvent =
    events.find((event) => event.is_current) ??
    events.find((event) => event.is_next) ??
    null

  const goRelative = (delta: number) => {
    const nextIndex = selectedIndex + delta
    const next = events[nextIndex]
    if (next) {
      onSelect(next.id)
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 rounded-full"
          disabled={selectedIndex <= 0}
          onClick={() => goRelative(-1)}
          aria-label="Previous gameweek"
        >
          <ChevronLeftIcon />
        </Button>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex w-max items-center gap-1 px-0.5">
            {events.map((event) => {
              const shape = shapes.get(event.id)
              const isSelected = event.id === selectedEventId

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelect(event.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                    isSelected
                      ? "bg-foreground text-background"
                      : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                  )}
                >
                  <span>GW{event.id}</span>
                  {shape?.isDouble ? (
                    <span
                      className={cn(
                        "rounded-full px-1 text-[9px] font-bold tracking-wide",
                        isSelected
                          ? "bg-background/20 text-background"
                          : "bg-pl-blue/15 text-pl-blue"
                      )}
                    >
                      DGW
                    </span>
                  ) : null}
                  {shape?.isBlank ? (
                    <span
                      className={cn(
                        "rounded-full px-1 text-[9px] font-bold tracking-wide",
                        isSelected
                          ? "bg-background/20 text-background"
                          : "bg-pl-orange/15 text-pl-orange"
                      )}
                    >
                      BGW
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 rounded-full"
          disabled={selectedIndex < 0 || selectedIndex >= events.length - 1}
          onClick={() => goRelative(1)}
          aria-label="Next gameweek"
        >
          <ChevronRightIcon />
        </Button>
      </div>

      {currentEvent && currentEvent.id !== selectedEventId ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => onSelect(currentEvent.id)}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Jump to current
          </button>
        </div>
      ) : null}
    </div>
  )
}
