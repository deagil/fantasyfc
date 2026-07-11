import { ChevronLeftIcon } from "lucide-react"

import { MobilePageHeader } from "@/components/mobile-page-header"
import { Button } from "@/components/ui/button"
import {
  contentContainerClassName,
  desktopPageChromeClassName,
  hubTileContainerClassName,
  pageChromeRowClassName,
} from "@/lib/layout"
import { cn } from "@/lib/utils"

type DetailPageChromeProps = {
  title: string
  backRender: React.ReactElement
  titleStyle?: React.CSSProperties
  className?: string
}

/**
 * Desktop detail chrome row — place inside the same hub-tile-container as
 * page content (mirrors hub NavTabs in `_app/route.tsx`).
 */
export function DetailPageDesktopChrome({
  title,
  backRender,
  titleStyle,
  className,
}: DetailPageChromeProps) {
  return (
    <div className={cn(desktopPageChromeClassName, className)}>
      <div className={cn(pageChromeRowClassName, "min-w-0 flex-1")}>
        <div className="grid min-w-0 flex-1 grid-cols-[1.75rem_1fr] items-center gap-1">
          <div className="flex size-7 items-center justify-center">
            <Button
              variant="ghost"
              size="icon-sm"
              className="shell-chrome-ghost shrink-0 rounded-full"
              aria-label="Back"
              render={backRender}
            >
              <ChevronLeftIcon />
            </Button>
          </div>
          <h1
            className="truncate font-heading text-xl font-semibold tracking-tight text-(--shell-foreground)"
            style={titleStyle ?? { viewTransitionName: "page-title" }}
          >
            {title}
          </h1>
        </div>
      </div>
    </div>
  )
}

/** Mobile floating header + desktop chrome wrapper matching hub nav placement. */
export function DetailPageChrome({
  title,
  backRender,
  titleStyle,
}: DetailPageChromeProps) {
  return (
    <>
      <MobilePageHeader
        className="lg:hidden"
        title={title}
        titleStyle={titleStyle}
        backRender={backRender}
      />

      <div
        className={cn(
          contentContainerClassName,
          hubTileContainerClassName,
          "hidden lg:block"
        )}
      >
        <DetailPageDesktopChrome
          title={title}
          backRender={backRender}
          titleStyle={titleStyle}
        />
      </div>
    </>
  )
}
