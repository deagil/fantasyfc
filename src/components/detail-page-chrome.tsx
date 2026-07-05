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
}

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
        <div className={desktopPageChromeClassName}>
          <div className={cn(pageChromeRowClassName, "min-w-0 flex-1")}>
            <div className="grid min-w-0 flex-1 grid-cols-[1.75rem_1fr] items-center gap-1">
              <div className="flex size-7 items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shell-chrome-ghost shrink-0 rounded-full"
                  aria-label="Back"
                  render={backRender}
                />
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
      </div>
    </>
  )
}
