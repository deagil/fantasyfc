// Types for the TheSportsDB enrichment layer. Pure types — client-safe.

/** Raw SportsDB player object (v1 lookupplayer / lookup_all_players). */
export type SportsDbPlayer = {
  idPlayer: string
  idTeam: string | null
  strPlayer: string
  strPlayerAlternate: string | null
  dateBorn: string | null
  strNationality: string | null
  strPosition: string | null
  strSide: string | null
  strNumber: string | null
  strHeight: string | null
  strWeight: string | null
  strBirthLocation: string | null
  strStatus: string | null
  strSigning: string | null
  strWage: string | null
  strDescriptionEN: string | null
  strFacebook: string | null
  strTwitter: string | null
  strInstagram: string | null
  strYoutube: string | null
  strThumb: string | null
  strCutout: string | null
  strRender: string | null
  strPoster: string | null
  strBanner: string | null
  strFanart1: string | null
  strFanart2: string | null
  strFanart3: string | null
  strFanart4: string | null
  strCreativeCommons: string | null
}

/** Raw SportsDB team object (v1 search_all_teams / lookupteam). */
export type SportsDbTeam = {
  idTeam: string
  strTeam: string
  strTeamAlternate: string | null
  strTeamShort: string | null
  strBadge: string | null
  strLogo: string | null
  strEquipment: string | null
  strBanner: string | null
  strFanart1: string | null
  strColour1: string | null
  strColour2: string | null
  strColour3: string | null
  strStadium: string | null
  intStadiumCapacity: string | null
  strLocation: string | null
  intFormedYear: string | null
  strKeywords: string | null
}

/** FPL bootstrap fields the enrichment matcher needs. */
export type EnrichmentFplElement = {
  id: number
  code: number
  first_name: string
  second_name: string
  web_name: string
  birth_date: string | null
  team: number
  team_code: number
  element_type: number
  status: string
}

export type EnrichmentFplTeam = {
  id: number
  code: number
  name: string
  short_name: string
}

export type PlayerMatchMethod = "dob+name" | "name" | "manual"

export type PlayerMatch = {
  playerCode: number
  webName: string
  sportsdbId: number
  method: PlayerMatchMethod
  player: SportsDbPlayer
}

export type PlayerEnrichmentBio = {
  fullName: string | null
  nationality: string | null
  birthDate: string | null
  birthLocation: string | null
  height: string | null
  weight: string | null
  side: string | null
  number: string | null
  signing: string | null
  wage: string | null
  description: string | null
  socials: {
    twitter: string | null
    instagram: string | null
    facebook: string | null
    youtube: string | null
  }
  poster: string | null
  banner: string | null
  fanart: string[]
}

/** Compact per-player payload served to the client. */
export type PlayerEnrichmentDTO = {
  playerCode: number
  sportsdbId: number
  cutoutUrl: string | null
  renderUrl: string | null
  thumbUrl: string | null
  position: string | null
  creativeCommons: boolean
  bio: PlayerEnrichmentBio
}

export type TeamEnrichmentDTO = {
  teamCode: number
  sportsdbId: number
  name: string
  badgeUrl: string | null
  logoUrl: string | null
  equipmentUrl: string | null
  bannerUrl: string | null
  colours: string[]
  stadium: {
    name: string | null
    capacity: number | null
    location: string | null
  }
}

export type EnrichmentPayload = {
  syncedAt: string | null
  players: PlayerEnrichmentDTO[]
  teams: TeamEnrichmentDTO[]
}

/** Result of the ID-discovery pass (league page + team pages + team API lookups). */
export type DiscoverEnrichmentResult = {
  teamsDiscovered: number
  teamsMatched: number
  teamsUnmatched: string[]
  candidatesTotal: number
  candidatesPending: number
}

/** Result of one batched player-seed pass. Loop until `remaining` is 0. */
export type SeedEnrichmentResult = {
  processed: number
  matched: number
  remaining: number
  byMethod: Record<string, number>
  unmatched: { team: string; name: string }[]
}

/** SportsDB image URLs support size variants by appending a suffix. */
export function sizedImageUrl(
  url: string | null,
  size: "tiny" | "small" | "medium" | "original" = "small"
): string | null {
  if (!url) {
    return null
  }
  return size === "original" ? url : `${url}/${size}`
}
