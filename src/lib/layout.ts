export const contentContainerClassName = "mx-auto w-full max-w-7xl px-3"

/**
 * Hub tile grid: row height is derived from column width via container queries
 * so 1×1 cells stay square. Three row units on desktop; six on mobile stack.
 */
export const hubTileGridClassName =
  "@container/tiles [container-type:inline-size] grid grid-cols-2 gap-4 [grid-template-rows:repeat(6,calc((100cqw-1rem)/2))] lg:grid-cols-4 lg:[grid-template-rows:repeat(3,calc(round(down,(100cqw-3rem)/4,1px)))]"

export const appShellClassName = "app-shell relative min-h-svh text-(--shell-foreground)"

/**
 * Scrollable spacer before page content on mobile. Clears floating title/actions
 * at rest; scrolls away so content can reach the screen edge underneath.
 */
export const mobileContentTopSpacerClassName =
  "h-[calc(env(safe-area-inset-top)+3.5rem+1rem)] shrink-0 lg:hidden"
