export function getKeyboardInset(
  innerHeight: number,
  viewport: Pick<VisualViewport, "height" | "offsetTop">
) {
  return Math.max(
    0,
    Math.round(innerHeight - viewport.height - viewport.offsetTop)
  )
}

export function applyDrawerKeyboardInset(
  drawer: HTMLElement,
  inset: number,
  visibleHeight: number
) {
  if (inset > 0) {
    drawer.style.bottom = `${inset}px`
    // Keep the sheet inside the visible viewport above the keyboard.
    drawer.style.maxHeight = `${Math.max(120, Math.floor(visibleHeight - 8))}px`
    return
  }

  drawer.style.bottom = ""
  drawer.style.maxHeight = ""
}
