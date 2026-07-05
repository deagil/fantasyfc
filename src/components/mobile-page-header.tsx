import { ChevronLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/user-menu"
import { contentContainerClassName, pageChromeRowClassName } from "@/lib/layout"
import { cn } from "@/lib/utils"

type MobilePageHeaderProps = {
  title: string
  backLabel?: string
  onBack?: () => void
  backRender?: React.ReactElement
  titleStyle?: React.CSSProperties
  className?: string
}

export function MobilePageHeader({
  title,
  backLabel = "Back",
  onBack,
  backRender,
  titleStyle,
  className,
}: MobilePageHeaderProps) {
  return (
    <header
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-50 lg:hidden",
        className
      )}
    >
      <div
        className={cn(
          contentContainerClassName,
          "pt-[max(0.75rem,env(safe-area-inset-top))]"
        )}
      >
        <div className={cn(pageChromeRowClassName, "pointer-events-auto gap-3")}>
          <div className="grid min-w-0 flex-1 grid-cols-[1.75rem_1fr] items-center gap-1">
            <div className="flex size-7 items-center justify-center">
              {backRender ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shell-chrome-ghost shrink-0 rounded-full"
                  aria-label={backLabel}
                  render={backRender}
                />
              ) : onBack ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shell-chrome-ghost shrink-0 rounded-full"
                  aria-label={backLabel}
                  onClick={onBack}
                >
                  <ChevronLeftIcon />
                </Button>
              ) : null}
            </div>
            <h1
              className="truncate font-heading text-xl font-semibold tracking-tight text-(--shell-foreground)"
              style={titleStyle ?? { viewTransitionName: "page-title" }}
            >
              {title}
            </h1>
          </div>
          <div
            className="shrink-0"
            style={{ viewTransitionName: "page-header-actions" }}
          >
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
