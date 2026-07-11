import { describe, expect, it } from "vitest"

import type { FplClassicLeague, FplLeagueStanding } from "@/lib/fpl/types"
import {
  awardDescription,
  awardHeadline,
  findSilverwareTitle,
  getSilverwareTitles,
  podiumStatsFromStandings,
} from "@/lib/trophies/silverware"

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

function standing(
  partial: Pick<FplLeagueStanding, "rank" | "entry" | "entry_name" | "total"> &
    Partial<FplLeagueStanding>
): FplLeagueStanding {
  return {
    id: partial.entry,
    event_total: 0,
    player_name: partial.player_name ?? "Manager",
    last_rank: partial.rank,
    rank_sort: partial.rank,
    has_played: true,
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

describe("findSilverwareTitle", () => {
  it("returns the podium title for a league id", () => {
    const leagues = [
      league({ id: 9, name: "Mini League", entry_rank: 2, rank_count: 8 }),
    ]

    expect(findSilverwareTitle(leagues, 9)).toEqual({
      leagueId: 9,
      leagueName: "Mini League",
      rank: 2,
      medal: "silver",
      leagueSize: 8,
    })
    expect(findSilverwareTitle(leagues, 99)).toBeUndefined()
  })
})

describe("podiumStatsFromStandings", () => {
  it("computes points and margin to the next rank", () => {
    const stats = podiumStatsFromStandings(
      [
        standing({
          rank: 3,
          entry: 100,
          entry_name: "Ndiayeberpunk 2077",
          total: 2100,
        }),
        standing({
          rank: 4,
          entry: 101,
          entry_name: "Next Place",
          total: 2085,
        }),
      ],
      3
    )

    expect(stats).toEqual({
      entryId: 100,
      entryName: "Ndiayeberpunk 2077",
      playerName: "Manager",
      points: 2100,
      margin: 15,
    })
  })
})

describe("award copy", () => {
  const title = {
    leagueId: 1,
    leagueName: "WeKnowBall",
    rank: 3 as const,
    medal: "bronze" as const,
    leagueSize: 5,
  }

  it("uses second person when the viewer owns the award", () => {
    expect(awardHeadline(title)).toBe("3rd place")
    expect(
      awardDescription(title, {
        season: "25/26",
        entryName: "My Team",
        viewerOwnsAward: true,
        points: 2100,
        margin: 15,
      })
    ).toContain(
      "You earned this award when you finished 3rd in WeKnowBall on 2100 points, 15 ahead of the next place"
    )
  })

  it("uses third person when viewing someone else's award", () => {
    expect(
      awardDescription(title, {
        season: "25/26",
        entryName: "Other Team",
        viewerOwnsAward: false,
        points: 2100,
        margin: 15,
      })
    ).toContain(
      "Other Team earned this award by finishing 3rd in WeKnowBall on 2100 points, 15 ahead of the next place"
    )
  })
})
