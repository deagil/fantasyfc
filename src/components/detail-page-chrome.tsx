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
            <Button
              variant="ghost"
              size="icon-sm"
              className="shell-chrome-ghost shrink-0 rounded-full"
              aria-label="Back"
              render={backRender}
            />
            <h1
              className="truncate font-heading text-xl font-semibold tracking-tight text-(--shell-foreground)"
              style={titleStyle}
            >
              {title}
            </h1>
          </div>
        </div>
      </div>
    </>
  )
}
