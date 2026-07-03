import type { ReactNode } from "react"

type SettingsRowProps = {
  label: ReactNode
  value: ReactNode
  action?: ReactNode
}

export function SettingsRow({ label, value, action }: SettingsRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted-foreground">{label}</div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
        <div className="min-w-0 truncate font-medium">{value}</div>
        {action ? (
          <div className="shrink-0 [&_a]:w-full [&_button]:w-full lg:[&_a]:w-auto lg:[&_button]:w-auto">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  )
}
