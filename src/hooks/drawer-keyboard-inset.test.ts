import { describe, expect, it } from "vitest"

import {
  applyDrawerKeyboardInset,
  getKeyboardInset,
} from "@/hooks/drawer-keyboard-inset"

describe("getKeyboardInset", () => {
  it("returns 0 when the visual viewport fills the window", () => {
    expect(getKeyboardInset(800, { height: 800, offsetTop: 0 })).toBe(0)
  })

  it("returns the covered height when the keyboard shrinks the visual viewport", () => {
    expect(getKeyboardInset(800, { height: 500, offsetTop: 0 })).toBe(300)
  })

  it("accounts for visual viewport offset from browser chrome", () => {
    expect(getKeyboardInset(800, { height: 500, offsetTop: 40 })).toBe(260)
  })

  it("never returns a negative inset", () => {
    expect(getKeyboardInset(500, { height: 600, offsetTop: 0 })).toBe(0)
  })
})

describe("applyDrawerKeyboardInset", () => {
  function createDrawer() {
    return {
      style: {
        bottom: "",
        maxHeight: "",
      },
    } as unknown as HTMLElement
  }

  it("lifts the drawer and caps its height when the keyboard is open", () => {
    const drawer = createDrawer()

    applyDrawerKeyboardInset(drawer, 300, 500)

    expect(drawer.style.bottom).toBe("300px")
    expect(drawer.style.maxHeight).toBe("492px")
  })

  it("clears inline positioning when the keyboard is closed", () => {
    const drawer = createDrawer()
    drawer.style.bottom = "300px"
    drawer.style.maxHeight = "492px"

    applyDrawerKeyboardInset(drawer, 0, 800)

    expect(drawer.style.bottom).toBe("")
    expect(drawer.style.maxHeight).toBe("")
  })
})
