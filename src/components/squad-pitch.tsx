import { SquadPlayerToken } from "@/components/squad-player-token"
import { Skeleton } from "@/components/ui/skeleton"
import type { SquadLine, SquadSlot } from "@/lib/fpl/squad"
import { cn } from "@/lib/utils"

function PitchMarkings() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 132"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <rect
        x="3.5"
        y="3.5"
        width="93"
        height="125"
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="0.6"
      />
      <line
        x1="3.5"
        y1="66"
        x2="96.5"
        y2="66"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="0.55"
      />
      <circle
        cx="50"
        cy="66"
        r="11.5"
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="0.55"
      />
      <circle cx="50" cy="66" r="0.9" fill="rgba(255,255,255,0.35)" />
      <rect
        x="21"
        y="3.5"
        width="58"
        height="18"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.5"
      />
      <rect
        x="21"
        y="110.5"
        width="58"
        height="18"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.5"
      />
      <rect
        x="34"
        y="3.5"
        width="32"
        height="7"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.5"
      />
      <rect
        x="34"
        y="121.5"
        width="32"
        height="7"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.5"
      />
    </svg>
  )
}

function PitchLineRow({
  line,
  selectedPlayerId,
  onSelect,
}: {
  line: SquadLine
  selectedPlayerId: number | null
  onSelect: (playerId: number) => void
}) {
  const compact = line.slots.length >= 5

  return (
    <div className="relative z-10 flex w-full items-end justify-evenly px-1">
      {line.slots.map((slot) => (
        <SquadPlayerToken
          key={slot.player.id}
          slot={slot}
          compact={compact}
          selected={selectedPlayerId === slot.player.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

export function SquadPitch({
  lines,
  bench,
  chipLabel,
  chipId,
  selectedPlayerId,
  onSelect,
  className,
}: {
  lines: readonly SquadLine[]
  bench: readonly SquadSlot[]
  chipLabel: string | null
  chipId: string | null
  selectedPlayerId: number | null
  onSelect: (playerId: number) => void
  className?: string
}) {
  const pitchChip =
    chipId === "freehit" || chipId === "wildcard" ? chipLabel : null
  const benchChip = chipId === "bboost" ? chipLabel : null

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-2", className)}>
      <div
        className={cn(
          "relative flex min-h-[22rem] flex-1 flex-col justify-around overflow-hidden py-3",
          "rounded-xl lg:rounded-[2px]"
        )}
        style={{
          backgroundColor: "#14532d",
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.045) 0 12.5%, transparent 12.5% 25%)",
        }}
      >
        <PitchMarkings />
        {pitchChip ? (
          <span className="absolute top-2 left-2 z-20 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-foreground uppercase">
            {pitchChip}
          </span>
        ) : null}
        {lines.map((line) => (
          <PitchLineRow
            key={line.type}
            line={line}
            selectedPlayerId={selectedPlayerId}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="relative flex flex-col gap-1.5 rounded-xl bg-zinc-800 px-2 pt-2 pb-2 lg:rounded-[2px]">
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-semibold tracking-wide text-white/70 uppercase">
            Bench
          </p>
          {benchChip ? (
            <span className="rounded-full bg-pl-green px-2 py-0.5 text-[10px] font-semibold tracking-wide text-pl-purple uppercase">
              {benchChip}
            </span>
          ) : null}
        </div>
        <div className="flex items-end justify-evenly">
          {bench.map((slot) => (
            <SquadPlayerToken
              key={slot.player.id}
              slot={slot}
              compact
              selected={selectedPlayerId === slot.player.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SquadPitchSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div
        className="flex min-h-[22rem] flex-1 flex-col justify-around rounded-xl px-4 py-6 lg:rounded-[2px]"
        style={{ backgroundColor: "#14532d" }}
      >
        {[3, 4, 3, 1].map((count, lineIndex) => (
          <div key={lineIndex} className="flex justify-evenly">
            {Array.from({ length: count }, (_, index) => (
              <Skeleton
                key={index}
                className="h-16 w-12 rounded-md bg-white/15"
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-evenly rounded-xl bg-zinc-800 px-2 py-3 lg:rounded-[2px]">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-11 rounded-md bg-white/10" />
        ))}
      </div>
    </div>
  )
}
