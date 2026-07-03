import { ChevronLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/user-menu"
import { contentContainerClassName } from "@/lib/layout"
import { cn } from "@/lib/utils"

type MobilePageHeaderProps = {
  title: string
  backLabel?: string
  onBack?: () => void
  className?: string
}

export function MobilePageHeader({
  title,
  backLabel = "Back",
  onBack,
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
        <div className="pointer-events-auto flex h-11 items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {onBack ? (
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 shrink-0 px-2"
                onClick={onBack}
              >
                <ChevronLeftIcon />
                <span className="sr-only sm:not-sr-only">{backLabel}</span>
              </Button>
            ) : null}
            <h1
              className="truncate font-heading text-xl font-semibold tracking-tight text-(--shell-foreground)"
              style={{ viewTransitionName: "page-title" }}
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
