import { describe, expect, it } from "vitest"

import { getRatingTone, ratingTextClassName } from "./tone"

describe("getRatingTone", () => {
  it("maps FIFA-style bands", () => {
    expect(getRatingTone(95)).toBe("elite")
    expect(getRatingTone(90)).toBe("elite")
    expect(getRatingTone(89)).toBe("good")
    expect(getRatingTone(76)).toBe("good")
    expect(getRatingTone(75)).toBe("cool")
    expect(getRatingTone(70)).toBe("cool")
    expect(getRatingTone(69)).toBe("fair")
    expect(getRatingTone(65)).toBe("fair")
    expect(getRatingTone(64)).toBe("poor")
    expect(getRatingTone(50)).toBe("poor")
    expect(getRatingTone(49)).toBe("bad")
    expect(getRatingTone(10)).toBe("bad")
  })

  it("returns a text class for each band", () => {
    expect(ratingTextClassName(90)).toBe("text-rating-elite")
    expect(ratingTextClassName(72)).toBe("text-rating-cool")
    expect(ratingTextClassName(40)).toBe("text-rating-bad")
  })
})
