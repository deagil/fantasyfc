import { describe, expect, it } from "vitest"

import type { FplClassicLeague } from "@/lib/fpl/types"
import { getSilverwareTitles } from "@/lib/trophies/silverware"

function league(
  partial: Partial<FplClassicLeague> & Pick<FplClassicLeague, "id" | "name" | "entry_rank">
): FplClassicLeague {
  return {
    short_name: null,
    league_type: "x",
    rank_count: 10,
    entry_last_rank: partial.entry_rank,
    active_phases: [],
    ...partial,
  }
}

describe("getSilverwareTitles", () => {
  it("keeps only podium ranks and sorts gold first", () => {
    const titles = getSilverwareTitles([
      league({ id: 1, name: "Bronze League", entry_rank: 3 }),
      league({ id: 2, name: "Also Ran", entry_rank: 5 }),
      league({ id: 3, name: "Gold League", entry_rank: 1 }),
    ])

    expect(titles.map((title) => title.leagueName)).toEqual([
      "Gold League",
      "Bronze League",
    ])
    expect(titles[0]?.medal).toBe("gold")
    expect(titles[1]?.medal).toBe("bronze")
  })
})
