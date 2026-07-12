import { cn } from "@/lib/utils"

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

export const appShellClassName =
  "app-shell relative min-h-dvh text-(--shell-foreground)"

/** Shared top chrome row height (mobile header + detail back rows). */
export const pageChromeRowClassName = "flex h-11 min-h-11 items-center gap-1"

/** Desktop chrome row width cap — matches the hub tile grid. */
export const desktopPageChromeClassName = cn(
  "hidden min-h-11 items-center gap-4 lg:flex",
  hubDesktopAlignClassName
)

/** Main layout wrapper shared by hub and detail pages. */
export const hubMainClassName = cn(
  "flex min-h-0 flex-col",
  // Tab bar clearance + bottom safe area so tiles can scroll under the home
  // indicator / tab chrome instead of stopping at an artificial crop.
  "pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:flex-1 lg:justify-start lg:pt-4 lg:pb-3"
)

/** Tile content section below top chrome (nav tabs or detail header). */
export const hubContentSectionClassName = cn(
  contentContainerClassName,
  hubTileContainerClassName,
  "lg:mt-2"
)

/**
 * Clears the floating header row at rest. Safe-area is NOT an empty letterbox —
 * page content starts under the status bar / island and keeps scrolling
 * offscreen; header controls stay readable via MobilePageHeader padding.
 */
export const mobileContentTopSpacerClassName =
  "h-[calc(2.75rem+1.25rem)] shrink-0 lg:hidden"
