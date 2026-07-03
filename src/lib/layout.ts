export const contentContainerClassName = "mx-auto w-full max-w-7xl px-3"

/** Container query root for hub tile cell sizing (`100cqw`). */
export const hubTileContainerClassName = "hub-tile-container w-full"

/** Desktop width cap matching the 4-column hub grid. */
export const hubDesktopAlignClassName = "hub-desktop-align"

/**
 * Hub tile grid: square cells from container width, capped by viewport height on
 * desktop so fullscreen layouts do not stretch rows off-screen.
 */
export const hubTileGridClassName =
  "hub-tile-grid hub-desktop-align content-start min-w-0"

export const appShellClassName = "app-shell relative min-h-svh text-(--shell-foreground)"

/**
 * Scrollable spacer before page content on mobile. Clears floating title/actions
 * at rest; scrolls away so content can reach the screen edge underneath.
 */
export const mobileContentTopSpacerClassName =
  "h-[calc(env(safe-area-inset-top)+3.5rem+1rem)] shrink-0 lg:hidden"
