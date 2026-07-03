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
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 truncate font-medium">{value}</div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}
