import { useCallback, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

type ScrollFadeEdges = {
  top: boolean
  bottom: boolean
  left: boolean
  right: boolean
}

const hiddenEdges: ScrollFadeEdges = {
  top: false,
  bottom: false,
  left: false,
  right: false,
}

type ScrollFadeProps = {
  className?: string
  contentClassName?: string
  /** CSS color variable for fade gradients, e.g. `--tile-bg` or `--popover`. */
  fadeFrom?: string
  orientation?: "vertical" | "horizontal" | "both"
  children: React.ReactNode
}

function getScrollFadeEdges(element: HTMLElement): ScrollFadeEdges {
  const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } =
    element

  return {
    top: scrollTop > 2,
    bottom: scrollTop + clientHeight < scrollHeight - 2,
    left: scrollLeft > 2,
    right: scrollLeft + clientWidth < scrollWidth - 2,
  }
}

export function ScrollFade({
  className,
  contentClassName,
  fadeFrom = "--tile-bg",
  orientation = "vertical",
  children,
}: ScrollFadeProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState<ScrollFadeEdges>(hiddenEdges)

  const updateEdges = useCallback(() => {
    const element = scrollRef.current
    if (!element) {
      return
    }

    setEdges(getScrollFadeEdges(element))
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) {
      return
    }

    updateEdges()

    const resizeObserver = new ResizeObserver(updateEdges)
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [updateEdges])

  const showVertical = orientation === "vertical" || orientation === "both"
  const showHorizontal = orientation === "horizontal" || orientation === "both"
  const fadeFromClass = `from-(${fadeFrom})`

  return (
    <div className={cn("relative min-h-0 min-w-0", className)}>
      {showVertical && edges.top ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-10 h-5 bg-gradient-to-b to-transparent",
            fadeFromClass
          )}
        />
      ) : null}
      {showVertical && edges.bottom ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-5 bg-gradient-to-t to-transparent",
            fadeFromClass
          )}
        />
      ) : null}
      {showHorizontal && edges.left ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r to-transparent",
            fadeFromClass
          )}
        />
      ) : null}
      {showHorizontal && edges.right ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l to-transparent",
            fadeFromClass
          )}
        />
      ) : null}
      <div
        ref={scrollRef}
        onScroll={updateEdges}
        className={cn(
          "min-h-0 min-w-0",
          orientation === "horizontal" && "overflow-x-auto overflow-y-hidden",
          orientation === "vertical" && "overflow-y-auto overflow-x-hidden",
          orientation === "both" && "overflow-auto",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
