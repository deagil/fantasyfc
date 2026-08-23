import { describe, expect, it } from "vitest"

import { getPointsChipTone } from "./points-chip"

describe("getPointsChipTone", () => {
  it("uses grey for a blank 0 and red once they have minutes", () => {
    expect(getPointsChipTone(0, 0)).toBe("grey")
    expect(getPointsChipTone(0, null)).toBe("grey")
    expect(getPointsChipTone(0, undefined)).toBe("grey")
    expect(getPointsChipTone(0, 1)).toBe("red")
    expect(getPointsChipTone(1, 12)).toBe("red")
  })

  it("shares each named threshold with the values below the next one", () => {
    expect(getPointsChipTone(2, 90)).toBe("orange")
    expect(getPointsChipTone(3, 90)).toBe("green")
    expect(getPointsChipTone(5, 90)).toBe("green")
    expect(getPointsChipTone(6, 90)).toBe("blue")
    expect(getPointsChipTone(9, 90)).toBe("blue")
    expect(getPointsChipTone(10, 90)).toBe("purple")
    expect(getPointsChipTone(24, 90)).toBe("purple")
  })
})
