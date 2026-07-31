import { useEffect } from "react"
import type { RefObject } from "react"

import {
  applyDrawerKeyboardInset,
  getKeyboardInset,
} from "@/hooks/drawer-keyboard-inset"

export {
  applyDrawerKeyboardInset,
  getKeyboardInset,
} from "@/hooks/drawer-keyboard-inset"

function isEditableElement(target: EventTarget | null): target is HTMLElement {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

function scrollEditableIntoView(drawer: HTMLElement) {
  const active = document.activeElement
  if (!isEditableElement(active) || !drawer.contains(active)) return
  active.scrollIntoView({ block: "center", inline: "nearest" })
}

/**
 * Lifts a bottom drawer above the software keyboard and keeps the focused
 * field visible. Uses visualViewport so fixed bottom sheets stay usable on
 * iOS/Android where the layout viewport often does not shrink.
 */
export function useDrawerKeyboardAvoidance(
  drawerRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const drawer = drawerRef.current
    const visualViewport = window.visualViewport
    if (!drawer || !visualViewport) return

    let frame = 0
    let lastInset = 0

    const sync = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const inset = getKeyboardInset(window.innerHeight, visualViewport)
        applyDrawerKeyboardInset(drawer, inset, visualViewport.height)

        const keyboardOpened = inset > 0 && lastInset === 0
        const keyboardGrew = inset > lastInset + 40
        lastInset = inset

        if (keyboardOpened || keyboardGrew) {
          scrollEditableIntoView(drawer)
        }
      })
    }

    const onFocusIn = (event: FocusEvent) => {
      if (!isEditableElement(event.target)) return
      sync()
      // iOS often resizes the visual viewport slightly after focus.
      window.setTimeout(() => {
        sync()
        scrollEditableIntoView(drawer)
      }, 150)
    }

    sync()
    visualViewport.addEventListener("resize", sync)
    visualViewport.addEventListener("scroll", sync)
    drawer.addEventListener("focusin", onFocusIn)

    return () => {
      cancelAnimationFrame(frame)
      visualViewport.removeEventListener("resize", sync)
      visualViewport.removeEventListener("scroll", sync)
      drawer.removeEventListener("focusin", onFocusIn)
      drawer.style.bottom = ""
      drawer.style.maxHeight = ""
    }
  }, [drawerRef])
}
