import { describe, expect, it } from "vitest"

import { extractEntityLinks, teamPageUrl } from "@/lib/enrichment/pages"

describe("extractEntityLinks", () => {
  const leagueHtml = `
    <a href="https://www.thesportsdb.com/team/133604-arsenal">Arsenal</a>
    <a href="https://www.thesportsdb.com/team/133601-aston-villa">Aston Villa</a>
    <a href="https://www.thesportsdb.com/team/133619-brighton-and-hove-albion">Brighton</a>
    <a href="https://www.thesportsdb.com/team/133604-arsenal">Arsenal again</a>
    <img src="https://r2.thesportsdb.com/images/media/team/badge/uyhbfe1612467038.png/tiny">
    <a href="https://www.thesportsdb.com/event/2267445-crystal-palace-vs-arsenal">event</a>
  `

  it("extracts unique team ids with slugs, ignoring badges and events", () => {
    expect(extractEntityLinks(leagueHtml, "team")).toEqual([
      { id: 133604, slug: "arsenal" },
      { id: 133601, slug: "aston-villa" },
      { id: 133619, slug: "brighton-and-hove-albion" },
    ])
  })

  it("extracts player ids from team pages", () => {
    const teamHtml = `
      <a href="/player/34163007-bruno-fernandes">Bruno Fernandes</a>
      <a href="https://www.thesportsdb.com/player/34146573-casemiro">Casemiro</a>
      <a href="/player/34176261">Bayindir (no slug)</a>
    `
    expect(extractEntityLinks(teamHtml, "player")).toEqual([
      { id: 34163007, slug: "bruno-fernandes" },
      { id: 34146573, slug: "casemiro" },
      { id: 34176261, slug: null },
    ])
  })

  it("returns nothing when the entity type has no links", () => {
    expect(extractEntityLinks(leagueHtml, "player")).toEqual([])
  })

  it("builds team page urls with and without slug", () => {
    expect(teamPageUrl(133604, "arsenal")).toBe(
      "https://www.thesportsdb.com/team/133604-arsenal"
    )
    expect(teamPageUrl(133604)).toBe("https://www.thesportsdb.com/team/133604")
  })
})
