/**
 * ID discovery from TheSportsDB web pages.
 *
 * The league page lists all current PL teams and each team page lists the
 * current squad, with entity IDs in the link URLs. We extract ONLY the IDs
 * here — every piece of actual data and artwork is then fetched through the
 * official API endpoints. Note: TheSportsDB's terms ask users not to scrape
 * the website; the accepted trade-off (see docs/plans/thesportsdb-enrichment.md)
 * is that this touches ~21 public pages once per sync for navigational IDs
 * only, keeping all data access on the API. The premium API tier removes the
 * need for this step entirely — prefer it once the app ships.
 */

export const SPORTSDB_SITE = "https://www.thesportsdb.com"

export const SPORTSDB_LEAGUE_PAGE = `${SPORTSDB_SITE}/league/4328-english-premier-league`

export function teamPageUrl(id: number, slug?: string | null): string {
  return slug ? `${SPORTSDB_SITE}/team/${id}-${slug}` : `${SPORTSDB_SITE}/team/${id}`
}

export type EntityLink = {
  id: number
  slug: string | null
}

/**
 * Extract unique /team/{id}-{slug} or /player/{id}-{slug} links from a page.
 * Order of first appearance is preserved; duplicates collapse to the first.
 */
export function extractEntityLinks(
  html: string,
  entity: "team" | "player"
): EntityLink[] {
  const pattern = new RegExp(`\\/${entity}\\/(\\d+)(?:-([a-z0-9-]+))?`, "gi")
  const seen = new Set<number>()
  const links: EntityLink[] = []

  for (const match of html.matchAll(pattern)) {
    const id = Number(match[1])
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) {
      continue
    }
    seen.add(id)
    const slug = match[2] as string | undefined
    links.push({ id, slug: slug ? slug.toLowerCase() : null })
  }

  return links
}
