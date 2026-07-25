import { colorSchemeOptions } from "@/lib/color-scheme"
import { useColorScheme } from "@/lib/color-scheme-context"
import { kickoffThemes } from "@/lib/kickoff-theme"
import { useKickoffTheme } from "@/lib/kickoff-theme-context"
import { cn } from "@/lib/utils"

export function AppearancePicker({ className }: { className?: string }) {
  const { preference, setPreference } = useColorScheme()
  const { theme, setTheme } = useKickoffTheme()

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <PickerGroup label="Appearance" columnsClassName="grid-cols-3">
        {colorSchemeOptions.map((option) => (
          <PickerOption
            key={option.id}
            label={option.label}
            isSelected={preference === option.id}
            onSelect={() => setPreference(option.id)}
          />
        ))}
      </PickerGroup>
      <PickerGroup label="Theme" columnsClassName="grid-cols-1 sm:grid-cols-2">
        {kickoffThemes.map((option) => (
          <PickerOption
            key={option.id}
            label={option.label}
            isSelected={theme === option.id}
            onSelect={() => setTheme(option.id)}
          />
        ))}
      </PickerGroup>
    </div>
  )
}

function PickerGroup({
  label,
  columnsClassName,
  children,
}: {
  label: string
  columnsClassName: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className={cn("grid gap-2", columnsClassName)}>{children}</div>
    </div>
  )
}

function PickerOption({
  label,
  isSelected,
  onSelect,
}: {
  label: string
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
          ? "border-pl-purple bg-pl-purple/5 ring-2 ring-pl-purple/20 dark:border-pl-pink dark:bg-pl-pink/10 dark:ring-pl-pink/25"
          : "border-border hover:bg-muted/50"
      )}
    >
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
