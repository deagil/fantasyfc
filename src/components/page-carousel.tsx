import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"

import { contentContainerClassName, hubTileContainerClassName, mobileContentTopSpacerClassName } from "@/lib/layout"
import {
  defaultNavTabId,
  getNavPageIndex,
  isNavPageEnabled,
  navPages,
  tabSearch,
} from "@/lib/nav-pages"
import { cn } from "@/lib/utils"

const BASE_TRANSITION_MS = 380
const TRANSITION_MS_PER_PAGE = 220
const SNAP_BACK_MS = 320
const PAGE_TRANSITION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)"
const SWIPE_COMMIT_RATIO = 0.18
const AXIS_LOCK_PX = 8

function getTransitionMs(fromIndex: number, toIndex: number): number {
  const distance = Math.abs(toIndex - fromIndex)
  if (distance === 0) {
    return 0
  }
  return BASE_TRANSITION_MS + distance * TRANSITION_MS_PER_PAGE
}

function subscribePrefersReducedMotion(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
  mediaQuery.addEventListener("change", onStoreChange)
  return () => mediaQuery.removeEventListener("change", onStoreChange)
}

function getPrefersReducedMotionSnapshot(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribePrefersReducedMotion,
    getPrefersReducedMotionSnapshot,
    () => false
  )
}

type CarouselViewState = {
  displayIndex: number
  transitionMs: number
}

export function PageCarousel({ className }: { className?: string }) {
  const { tab } = useSearch({ from: "/_app" })
  const navigate = useNavigate()
  const prefersReducedMotion = usePrefersReducedMotion()

  const containerRef = useRef<HTMLDivElement>(null)
  const previousIndexRef = useRef(0)
  const pointerIdRef = useRef<number | null>(null)
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    offsetX: 0,
    axis: null as "x" | "y" | null,
  })

  const urlIndex = getNavPageIndex(tab)

  const [viewState, setViewState] = useState<CarouselViewState>({
    displayIndex: urlIndex,
    transitionMs: 0,
  })
  const [trackedUrlIndex, setTrackedUrlIndex] = useState(urlIndex)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffsetX, setDragOffsetX] = useState(0)

  const { displayIndex, transitionMs } = viewState

  useEffect(() => {
    const page = navPages[urlIndex]
    if (page && !page.enabled) {
      navigate({ to: "/", search: tabSearch(defaultNavTabId), replace: true })
    }
  }, [urlIndex, navigate])

  if (!isDragging && urlIndex !== trackedUrlIndex) {
    const previousIndex = previousIndexRef.current
    previousIndexRef.current = urlIndex
    setTrackedUrlIndex(urlIndex)
    setViewState({
      displayIndex: urlIndex,
      transitionMs: prefersReducedMotion
        ? 0
        : getTransitionMs(previousIndex, urlIndex),
    })
  }

  const commitToIndex = useCallback(
    (index: number, replace: boolean) => {
      const page = navPages[index]
      if (!page || index === displayIndex || !isNavPageEnabled(page.id)) {
        return
      }

      setTrackedUrlIndex(index)
      setViewState({
        displayIndex: index,
        transitionMs: prefersReducedMotion
          ? 0
          : getTransitionMs(displayIndex, index),
      })
      previousIndexRef.current = index
      navigate({ to: "/", search: tabSearch(page.id), replace })
    },
    [displayIndex, navigate, prefersReducedMotion]
  )

  const resetDrag = useCallback(() => {
    pointerIdRef.current = null
    dragRef.current = {
      startX: 0,
      startY: 0,
      offsetX: 0,
      axis: null,
    }
    setIsDragging(false)
    setDragOffsetX(0)
  }, [])

  const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return
    }

    if (dragRef.current.axis === "x") {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setViewState((current) => ({
      ...current,
      transitionMs: prefersReducedMotion ? 0 : SNAP_BACK_MS,
    }))
    resetDrag()
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }

    // Pointer capture is deferred to onPointerMove, once horizontal drag
    // intent is confirmed. Capturing eagerly here would intercept clicks on
    // nested interactive elements (e.g. tile links) before they can fire.
    pointerIdRef.current = event.pointerId
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: 0,
      axis: null,
    }
    setViewState((current) => ({ ...current, transitionMs: 0 }))
    setIsDragging(true)
    setDragOffsetX(0)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !isDragging ||
      pointerIdRef.current !== event.pointerId ||
      !containerRef.current
    ) {
      return
    }

    const deltaX = event.clientX - dragRef.current.startX
    const deltaY = event.clientY - dragRef.current.startY

    if (dragRef.current.axis === null) {
      if (
        Math.abs(deltaX) < AXIS_LOCK_PX &&
        Math.abs(deltaY) < AXIS_LOCK_PX
      ) {
        return
      }

      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        pointerIdRef.current = null
        dragRef.current.axis = "y"
        setIsDragging(false)
        setDragOffsetX(0)
        return
      }

      dragRef.current.axis = "x"
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    if (dragRef.current.axis !== "x") {
      return
    }

    let offsetX = deltaX
    if (displayIndex === 0 && offsetX > 0) {
      offsetX *= 0.35
    }
    if (displayIndex === navPages.length - 1 && offsetX < 0) {
      offsetX *= 0.35
    }

    dragRef.current.offsetX = offsetX
    setDragOffsetX(offsetX)
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) {
      return
    }

    if (dragRef.current.axis === "x") {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const width = containerRef.current?.offsetWidth ?? 1
    const offsetX = dragRef.current.offsetX
    const threshold = width * SWIPE_COMMIT_RATIO

    let nextIndex = displayIndex
    if (dragRef.current.axis === "x") {
      if (offsetX < -threshold) {
        nextIndex = Math.min(displayIndex + 1, navPages.length - 1)
      } else if (offsetX > threshold) {
        nextIndex = Math.max(displayIndex - 1, 0)
      }
    }

    pointerIdRef.current = null
    dragRef.current.axis = null
    setIsDragging(false)
    setDragOffsetX(0)

    if (nextIndex !== displayIndex) {
      commitToIndex(nextIndex, true)
      return
    }

    if (offsetX !== 0) {
      setViewState((current) => ({
      ...current,
      transitionMs: prefersReducedMotion ? 0 : SNAP_BACK_MS,
    }))
    }
  }

  const layoutIndex = displayIndex
  const containerWidth = containerRef.current?.offsetWidth ?? 1
  const dragPercent = (dragOffsetX / containerWidth) * 100
  const translateX = -displayIndex * 100 + (isDragging ? dragPercent : 0)

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative left-1/2 w-screen max-w-none -translate-x-1/2 touch-pan-y overflow-hidden",
        className
      )}
      data-hub-carousel=""
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div
        className={cn(
          "flex items-start will-change-transform transition-transform",
          !isDragging && transitionMs > 0
        )}
        style={{
          transform: `translateX(${translateX}%)`,
          transitionDuration: isDragging ? "0ms" : `${transitionMs}ms`,
          transitionTimingFunction: isDragging
            ? undefined
            : PAGE_TRANSITION_EASING,
        }}
      >
        {navPages.map((page, index) => {
          const isLayoutSlide = index === layoutIndex

          return (
            <div
              key={page.id}
              className={cn(
                "w-full shrink-0 self-start",
                !isLayoutSlide && "h-0 overflow-hidden"
              )}
              aria-hidden={page.id !== tab}
            >
              <div className={cn(contentContainerClassName, hubTileContainerClassName)}>
                <div className={mobileContentTopSpacerClassName} aria-hidden />
                {page.enabled ? <page.View /> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
