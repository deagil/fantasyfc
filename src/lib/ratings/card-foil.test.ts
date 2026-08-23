import { describe, expect, it } from "vitest"

import { getCardFoilTier, getPitchCardFoilOverall } from "./card-foil"

describe("getPitchCardFoilOverall", () => {
  it("keeps metal foils and floors everything else to bronze", () => {
    expect(getCardFoilTier(getPitchCardFoilOverall(94))).toBe("purple")
    expect(getCardFoilTier(getPitchCardFoilOverall(80))).toBe("gold")
    expect(getCardFoilTier(getPitchCardFoilOverall(70))).toBe("silver")
    expect(getCardFoilTier(getPitchCardFoilOverall(60))).toBe("bronze")
    expect(getCardFoilTier(getPitchCardFoilOverall(49))).toBe("bronze")
    expect(getCardFoilTier(getPitchCardFoilOverall(null))).toBe("bronze")
  })
})
