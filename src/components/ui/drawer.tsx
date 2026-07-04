import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type DrawerSize = "sm" | "md" | "lg"
export type DrawerAlign = "full" | "dock-right"

const drawerSizeClassNames: Record<DrawerSize, string> = {
  sm: "h-[50dvh]",
  md: "h-[calc(75dvh+5dvh)]",
  lg: "h-[90dvh]",
}

const drawerAlignClassNames: Record<DrawerAlign, string> = {
  full: "",
  "dock-right": cn(
    "lg:data-[vaul-drawer-direction=bottom]:inset-x-auto lg:data-[vaul-drawer-direction=bottom]:left-[var(--hub-dock-sheet-left)] lg:data-[vaul-drawer-direction=bottom]:right-auto",
    "lg:data-[vaul-drawer-direction=bottom]:w-[var(--hub-dock-sheet-width)]",
    "lg:data-[vaul-drawer-direction=bottom]:border-x"
  ),
}

function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/30 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  size = "md",
  align = "full",
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  size?: DrawerSize
  align?: DrawerAlign
}) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        data-drawer-size={size}
        data-drawer-align={align}
        className={cn(
          "group/drawer-content fixed z-50 flex flex-col overflow-hidden text-sm bg-popover shadow-xl",
          drawerSizeClassNames[size],
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:rounded-t-[min(var(--radius-4xl),24px)] data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=bottom]:border-border",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:h-auto data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:sm:max-w-sm",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:h-auto data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:sm:max-w-sm",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:h-auto data-[vaul-drawer-direction=top]:max-h-[80vh]",
          drawerAlignClassNames[align],
          className
        )}
        {...props}
      >
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "shrink-0 px-4 pt-1 pb-4 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left",
        className
      )}
      {...props}
    />
  )
}

type DrawerChromeProps = {
  title: React.ReactNode
  description?: React.ReactNode
  leading?: React.ReactNode
  className?: string
}

function DrawerChrome({
  title,
  description,
  leading,
  className,
}: DrawerChromeProps) {
  return (
    <div
      data-slot="drawer-chrome"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10",
        className
      )}
    >
      <div className="relative px-4 pt-1 pb-3">
        <div className="pointer-events-auto relative z-10 flex w-full min-h-7 items-center gap-2">
          <div className="shrink-0">
            {leading ?? (
              <span
                aria-hidden
                className="inline-block h-7 w-[3.25rem] shrink-0"
              />
            )}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <DrawerTitle className="block w-full truncate text-center">
              {title}
            </DrawerTitle>
            {description ? (
              <DrawerDescription className="block w-full line-clamp-2 text-center">
                {description}
              </DrawerDescription>
            ) : null}
          </div>
          <div className="shrink-0">
            <DrawerClose asChild>
              <Button
                size="sm"
                variant="outline"
                className="shell-chrome-btn shrink-0"
              >
                Close
              </Button>
            </DrawerClose>
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+1.5rem)] bg-gradient-to-b from-popover from-55% to-transparent"
        />
      </div>
    </div>
  )
}

const drawerChromeOffsetClassName = "pt-20"

type DrawerPanelProps = {
  title: React.ReactNode
  description?: React.ReactNode
  leading?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}

function DrawerPanel({
  title,
  description,
  leading,
  className,
  bodyClassName,
  children,
}: DrawerPanelProps) {
  return (
    <div
      className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", className)}
    >
      <div className={cn("flex min-h-0 flex-1 flex-col", bodyClassName)}>
        {children}
      </div>
      <DrawerChrome
        title={title}
        description={description}
        leading={leading}
      />
    </div>
  )
}

function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4",
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "mt-auto shrink-0 flex flex-col gap-2 border-t border-border/40 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]",
        className
      )}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerChrome,
  DrawerPanel,
  drawerChromeOffsetClassName,
  DrawerBody,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
