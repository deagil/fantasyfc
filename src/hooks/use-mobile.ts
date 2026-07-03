import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768

function subscribeIsMobile(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mediaQuery.addEventListener("change", onStoreChange)
  return () => mediaQuery.removeEventListener("change", onStoreChange)
}

function getIsMobileSnapshot(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribeIsMobile,
    getIsMobileSnapshot,
    () => false
  )
}
