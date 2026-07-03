import { kickoffThemes, type KickoffThemeId } from "@/lib/kickoff-theme"
import { useKickoffTheme } from "@/lib/kickoff-theme-context"
import { cn } from "@/lib/utils"

export function KickoffThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useKickoffTheme()

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-sm font-medium">Kickoff theme</span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {kickoffThemes.map((option) => (
          <KickoffThemeOption
            key={option.id}
            option={option}
            isSelected={theme === option.id}
            onSelect={() => setTheme(option.id)}
          />
        ))}
      </div>
    </div>
  )
}

function KickoffThemeOption({
  option,
  isSelected,
  onSelect,
}: {
  option: (typeof kickoffThemes)[number]
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        "flex flex-col gap-1 rounded-2xl border px-3 py-2.5 text-left transition-colors",
        isSelected
          ? "border-pl-purple bg-pl-purple/5 ring-2 ring-pl-purple/20"
          : "border-border hover:bg-muted/50"
      )}
    >
      <span className="text-sm font-medium">{option.label}</span>
      <span className="text-xs text-muted-foreground">{option.description}</span>
    </button>
  )
}

export type { KickoffThemeId }
