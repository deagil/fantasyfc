import { describe, expect, it } from "vitest"

import {
  lastNameOf,
  matchPlayers,
  matchTeams,
  normalizeName,
  similarity,
} from "@/lib/enrichment/matching"
import type {
  EnrichmentFplElement,
  EnrichmentFplTeam,
  SportsDbPlayer,
  SportsDbTeam,
} from "@/lib/enrichment/model"

function sdbPlayer(overrides: Partial<SportsDbPlayer>): SportsDbPlayer {
  return {
    idPlayer: "1",
    idTeam: "133612",
    strPlayer: "Test Player",
    strPlayerAlternate: null,
    dateBorn: null,
    strNationality: null,
    strPosition: null,
    strSide: null,
    strNumber: null,
    strHeight: null,
    strWeight: null,
    strBirthLocation: null,
    strStatus: "Active",
    strSigning: null,
    strWage: null,
    strDescriptionEN: null,
    strFacebook: null,
    strTwitter: null,
    strInstagram: null,
    strYoutube: null,
    strThumb: null,
    strCutout: null,
    strRender: null,
    strPoster: null,
    strBanner: null,
    strFanart1: null,
    strFanart2: null,
    strFanart3: null,
    strFanart4: null,
    strCreativeCommons: "Yes",
    ...overrides,
  }
}

function fplPlayer(
  overrides: Partial<EnrichmentFplElement>
): EnrichmentFplElement {
  return {
    id: 1,
    code: 100,
    first_name: "Test",
    second_name: "Player",
    web_name: "Player",
    birth_date: null,
    team: 1,
    team_code: 1,
    element_type: 3,
    status: "a",
    ...overrides,
  }
}

describe("name utilities", () => {
  it("normalises diacritics and case", () => {
    expect(normalizeName("Benjamin Šeško")).toBe("benjamin sesko")
    // Turkish dotless ı has no NFD decomposition — mapped explicitly.
    expect(normalizeName("Bayındır")).toBe("bayindir")
    expect(normalizeName("Højlund")).toBe("hojlund")
    expect(similarity("Bayındır", "Bayindir")).toBe(1)
  })

  it("extracts last names", () => {
    expect(lastNameOf("Bruno Miguel Borges Fernandes")).toBe("fernandes")
  })

  it("scores similar names highly", () => {
    expect(similarity("Bruno Fernandes", "Bruno Miguel Borges Fernandes")).toBeLessThan(1)
    expect(similarity("Erling Haaland", "Erling Håland")).toBeGreaterThan(0.85)
    expect(similarity("Erling Haaland", "Kevin De Bruyne")).toBeLessThan(0.5)
  })
})

describe("matchTeams", () => {
  const fplTeams: EnrichmentFplTeam[] = [
    { id: 1, code: 43, name: "Man City", short_name: "MCI" },
    { id: 2, code: 1, name: "Man Utd", short_name: "MUN" },
    { id: 3, code: 17, name: "Nott'm Forest", short_name: "NFO" },
  ]

  const sdbTeams: SportsDbTeam[] = [
    {
      idTeam: "133613",
      strTeam: "Manchester City",
      strTeamAlternate: "Man City",
      strTeamShort: "MCI",
      strBadge: "b1",
      strLogo: null,
      strEquipment: null,
      strBanner: null,
      strFanart1: null,
      strColour1: "#6CABDD",
      strColour2: null,
      strColour3: null,
      strStadium: "Etihad Stadium",
      intStadiumCapacity: "62000",
      strLocation: "Manchester",
      intFormedYear: "1880",
      strKeywords: "City",
    },
    {
      idTeam: "133612",
      strTeam: "Manchester United",
      strTeamAlternate: "Man United, Man Utd, MUFC",
      strTeamShort: "MUN",
      strBadge: "b2",
      strLogo: null,
      strEquipment: null,
      strBanner: null,
      strFanart1: null,
      strColour1: "#DA291C",
      strColour2: null,
      strColour3: null,
      strStadium: "Old Trafford",
      intStadiumCapacity: "74000",
      strLocation: "Manchester",
      intFormedYear: "1878",
      strKeywords: "United",
    },
    {
      idTeam: "133619",
      strTeam: "Nottingham Forest",
      strTeamAlternate: "Notts Forest, Forest",
      strTeamShort: null,
      strBadge: "b3",
      strLogo: null,
      strEquipment: null,
      strBanner: null,
      strFanart1: null,
      strColour1: "#DD0000",
      strColour2: null,
      strColour3: null,
      strStadium: "City Ground",
      intStadiumCapacity: "30000",
      strLocation: "Nottingham",
      intFormedYear: "1865",
      strKeywords: "Forest",
    },
  ]

  it("matches by short code first, then name similarity", () => {
    const { matches, unmatchedFpl } = matchTeams(fplTeams, sdbTeams)
    expect(unmatchedFpl).toHaveLength(0)
    expect(matches.get(1)?.idTeam).toBe("133613")
    expect(matches.get(2)?.idTeam).toBe("133612")
    // "Nott'm Forest" ↔ "Notts Forest" via alternate names, no short code.
    expect(matches.get(3)?.idTeam).toBe("133619")
  })

  it("matches Brighton despite conflicting short codes (real data: BRI vs BHA)", () => {
    // Live SportsDB data: strTeamShort "BRI", alternates include "Brighton ".
    const fpl: EnrichmentFplTeam[] = [
      { id: 5, code: 36, name: "Brighton", short_name: "BHA" },
    ]
    const sdb: SportsDbTeam[] = [
      {
        idTeam: "133619",
        strTeam: "Brighton and Hove Albion",
        strTeamAlternate: "Brighton & Hove Albion Football Club, Brighton , BHAFC",
        strTeamShort: "BRI",
        strBadge: null,
        strLogo: null,
        strEquipment: null,
        strBanner: null,
        strFanart1: null,
        strColour1: null,
        strColour2: null,
        strColour3: null,
        strStadium: null,
        intStadiumCapacity: null,
        strLocation: null,
        intFormedYear: null,
        strKeywords: null,
      },
    ]
    const { matches, unmatchedFpl } = matchTeams(fpl, sdb)
    expect(unmatchedFpl).toHaveLength(0)
    expect(matches.get(5)?.idTeam).toBe("133619")
  })

  it("never assigns one SportsDB team to two FPL teams", () => {
    const { matches } = matchTeams(fplTeams, sdbTeams)
    const ids = [...matches.values()].map((t) => t.idTeam)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("matchPlayers", () => {
  it("matches on DOB even when names differ in form", () => {
    const roster = [
      fplPlayer({
        code: 1,
        first_name: "Bruno Miguel",
        second_name: "Borges Fernandes",
        web_name: "B.Fernandes",
        birth_date: "1994-09-08",
      }),
    ]
    const squad = [
      sdbPlayer({ idPlayer: "34163007", strPlayer: "Bruno Fernandes", dateBorn: "1994-09-08" }),
    ]
    const { matches } = matchPlayers(roster, squad)
    expect(matches).toHaveLength(1)
    expect(matches[0].method).toBe("dob+name")
    expect(matches[0].sportsdbId).toBe(34163007)
  })

  it("disambiguates shared birthdays by name", () => {
    const roster = [
      fplPlayer({ code: 1, first_name: "John", second_name: "Smith", web_name: "Smith", birth_date: "2000-01-01" }),
      fplPlayer({ code: 2, first_name: "Dave", second_name: "Jones", web_name: "Jones", birth_date: "2000-01-01" }),
    ]
    const squad = [sdbPlayer({ idPlayer: "5", strPlayer: "David Jones", dateBorn: "2000-01-01" })]
    const { matches } = matchPlayers(roster, squad)
    expect(matches).toHaveLength(1)
    expect(matches[0].playerCode).toBe(2)
  })

  it("falls back to name similarity without DOB, rejecting weak matches", () => {
    const roster = [
      fplPlayer({ code: 1, first_name: "Erling", second_name: "Haaland", web_name: "Haaland" }),
      fplPlayer({ code: 2, first_name: "Kevin", second_name: "De Bruyne", web_name: "De Bruyne" }),
    ]
    const squad = [
      sdbPlayer({ idPlayer: "7", strPlayer: "Erling Håland" }),
      sdbPlayer({ idPlayer: "8", strPlayer: "Somebody Completely Different" }),
    ]
    const { matches, unmatchedSdb } = matchPlayers(roster, squad)
    expect(matches).toHaveLength(1)
    expect(matches[0].playerCode).toBe(1)
    expect(matches[0].method).toBe("name")
    expect(unmatchedSdb.map((p) => p.idPlayer)).toEqual(["8"])
  })

  it("rejects a DOB match when the name is unrelated (dirty data)", () => {
    const roster = [
      fplPlayer({ code: 1, first_name: "Erling", second_name: "Haaland", web_name: "Haaland", birth_date: "2000-07-21" }),
    ]
    const squad = [
      sdbPlayer({ idPlayer: "9", strPlayer: "Totally Unrelated Name", dateBorn: "2000-07-21" }),
    ]
    const { matches, unmatchedSdb } = matchPlayers(roster, squad)
    expect(matches).toHaveLength(0)
    expect(unmatchedSdb).toHaveLength(1)
  })

  it("assigns each FPL player at most once", () => {
    const roster = [
      fplPlayer({ code: 1, first_name: "Bruno", second_name: "Fernandes", web_name: "B.Fernandes", birth_date: "1994-09-08" }),
    ]
    const squad = [
      sdbPlayer({ idPlayer: "1", strPlayer: "Bruno Fernandes", dateBorn: "1994-09-08" }),
      sdbPlayer({ idPlayer: "2", strPlayer: "Bruno Fernandes" }),
    ]
    const { matches, unmatchedSdb } = matchPlayers(roster, squad)
    expect(matches).toHaveLength(1)
    expect(matches[0].sportsdbId).toBe(1)
    expect(unmatchedSdb).toHaveLength(1)
  })
})
