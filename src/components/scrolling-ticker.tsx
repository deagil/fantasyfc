import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

type ScrollingTickerProps = {
  text: string
  className?: string
}

export function ScrollingTicker({ text, className }: ScrollingTickerProps) {
  const measureRef = useRef<HTMLSpanElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldScroll, setShouldScroll] = useState(false)

  useEffect(() => {
    const measure = measureRef.current
    const container = containerRef.current
    if (!measure || !container) {
      return
    }

    const updateShouldScroll = () => {
      setShouldScroll(measure.scrollWidth > container.clientWidth)
    }

    updateShouldScroll()

    const resizeObserver = new ResizeObserver(updateShouldScroll)
    resizeObserver.observe(measure)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className={cn("min-w-0 overflow-hidden", className)}>
      <div
        className={cn(
          "flex w-max items-baseline gap-8 whitespace-nowrap",
          shouldScroll && "animate-ticker"
        )}
        aria-live="polite"
      >
        <span ref={measureRef}>{text}</span>
        {shouldScroll ? (
          <span aria-hidden="true" className="text-inherit">
            {text}
          </span>
        ) : null}
      </div>
    </div>
  )
}
