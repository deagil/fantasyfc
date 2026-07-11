const FPL_RESOURCES = "https://resources.premierleague.com/premierleague"

/**
 * @deprecated Unlicensed source — these hotlink the Premier League's own CDN
 * (PA Images photos, trademarked crests) with no usage grant. Prefer the
 * TheSportsDB enrichment layer (`useEnrichmentMaps` in
 * `@/lib/enrichment/hooks`, joined by `element.code` / `team.code`), which
 * we use under its published terms with attribution. Keep only as a
 * last-resort fallback until enrichment coverage is verified, then remove.
 */
export function playerPhotoUrl(code: number): string {
  return `${FPL_RESOURCES}/photos/players/250x250/p${code}.png`
}

/** @deprecated See playerPhotoUrl — use team enrichment `badgeUrl` instead. */
export function teamBadgeUrl(code: number): string {
  return `${FPL_RESOURCES}/badges/t${code}.png`
}
