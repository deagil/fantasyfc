import { cn } from "@/lib/utils"

export function TeamCrest({
  badgeUrl,
  shortName,
  className,
}: {
  badgeUrl: string | null | undefined
  shortName: string
  className?: string
}) {
  if (badgeUrl) {
    return (
      <img
        src={badgeUrl}
        alt=""
        aria-hidden="true"
        className={cn("size-5 shrink-0 object-contain", className)}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[8px] font-bold tracking-tight text-muted-foreground",
        className
      )}
    >
      {shortName.slice(0, 3)}
    </span>
  )
}

export function DifficultyDots({
  difficulty,
  className,
}: {
  difficulty: number
  className?: string
}) {
  const clamped = Math.min(5, Math.max(1, Math.round(difficulty)))
  const tone =
    clamped <= 2
      ? "bg-pl-green"
      : clamped === 3
        ? "bg-pl-yellow"
        : "bg-pl-pink"

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      aria-label={`Difficulty ${clamped} of 5`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={cn(
            "size-1.5 rounded-full",
            index < clamped ? tone : "bg-foreground/15"
          )}
        />
      ))}
    </div>
  )
}
