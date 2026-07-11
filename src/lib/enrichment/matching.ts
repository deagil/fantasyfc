import type {
  EnrichmentFplElement,
  EnrichmentFplTeam,
  PlayerMatch,
  SportsDbPlayer,
  SportsDbTeam,
} from "@/lib/enrichment/model"

/**
 * Pure matching of FPL entities to SportsDB entities.
 *
 * Ported from backroom's merge.js with two upgrades: FPL now exposes
 * birth_date, so date-of-birth is the primary player signal (name similarity
 * is the tiebreaker/fallback), and matching happens within a team's roster
 * rather than across the whole league, which collapses the collision space.
 */

const NAME_SIMILARITY_THRESHOLD = 0.86
const TEAM_SIMILARITY_THRESHOLD = 0.6

export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "")
}

/** Letters NFD cannot decompose to ASCII (Turkish ı, Nordic ø, etc.). */
const SPECIAL_LETTERS: Record<string, string> = {
  ı: "i",
  ø: "o",
  đ: "d",
  ð: "d",
  ł: "l",
  ß: "ss",
  æ: "ae",
  œ: "oe",
  þ: "th",
}

export function normalizeName(value: string | null | undefined): string {
  return stripDiacritics(String(value ?? "").toLowerCase())
    .replace(/[ıøđðłßæœþ]/g, (letter) => SPECIAL_LETTERS[letter] ?? letter)
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function lastNameOf(full: string): string {
  const parts = normalizeName(full).split(" ")
  return parts[parts.length - 1] || ""
}

export function levenshtein(a: string, b: string): number {
  const s = normalizeName(a)
  const t = normalizeName(b)
  const m = s.length
  const n = t.length
  if (m === 0) return n
  if (n === 0) return m

  const dp = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost)
      prev = temp
    }
  }
  return dp[n]
}

export function similarity(a: string, b: string): number {
  const distance = levenshtein(a, b)
  const length = Math.max(normalizeName(a).length, normalizeName(b).length) || 1
  return 1 - distance / length
}

// --------------------------- Teams ---------------------------

export type TeamMatchResult = {
  /** FPL team id → SportsDB team. */
  matches: Map<number, SportsDbTeam>
  unmatchedFpl: EnrichmentFplTeam[]
}

/**
 * Match FPL teams to SportsDB teams: exact short-code first (MCI = MCI),
 * then best name similarity across name/alternate names.
 */
export function matchTeams(
  fplTeams: readonly EnrichmentFplTeam[],
  sdbTeams: readonly SportsDbTeam[]
): TeamMatchResult {
  const matches = new Map<number, SportsDbTeam>()
  const usedSdb = new Set<string>()
  const remaining: EnrichmentFplTeam[] = []

  for (const fpl of fplTeams) {
    const byShort = sdbTeams.find(
      (t) =>
        !usedSdb.has(t.idTeam) &&
        t.strTeamShort !== null &&
        t.strTeamShort.toUpperCase() === fpl.short_name.toUpperCase()
    )
    if (byShort) {
      matches.set(fpl.id, byShort)
      usedSdb.add(byShort.idTeam)
    } else {
      remaining.push(fpl)
    }
  }

  const unmatchedFpl: EnrichmentFplTeam[] = []
  for (const fpl of remaining) {
    let best: SportsDbTeam | null = null
    let bestScore = 0

    for (const sdb of sdbTeams) {
      if (usedSdb.has(sdb.idTeam)) {
        continue
      }
      const candidates = [
        sdb.strTeam,
        ...(sdb.strTeamAlternate ?? "").split(","),
      ].filter((name) => name.trim() !== "")
      const score = Math.max(
        ...candidates.map((name) => similarity(name, fpl.name))
      )
      if (score > bestScore) {
        bestScore = score
        best = sdb
      }
    }

    if (best && bestScore >= TEAM_SIMILARITY_THRESHOLD) {
      matches.set(fpl.id, best)
      usedSdb.add(best.idTeam)
    } else {
      unmatchedFpl.push(fpl)
    }
  }

  return { matches, unmatchedFpl }
}

// --------------------------- Players ---------------------------

function nameCandidates(player: SportsDbPlayer): string[] {
  return [player.strPlayer, player.strPlayerAlternate ?? ""].filter(
    (name) => name.trim() !== ""
  )
}

function bestNameSimilarity(
  player: SportsDbPlayer,
  fpl: EnrichmentFplElement
): number {
  const fplNames = [
    `${fpl.first_name} ${fpl.second_name}`,
    fpl.web_name,
  ]
  let best = 0
  for (const sdbName of nameCandidates(player)) {
    for (const fplName of fplNames) {
      best = Math.max(best, similarity(sdbName, fplName))
    }
  }
  return best
}

function sharesLastName(
  player: SportsDbPlayer,
  fpl: EnrichmentFplElement
): boolean {
  const sdbLast = lastNameOf(player.strPlayer)
  if (!sdbLast) {
    return false
  }
  const fplFull = normalizeName(`${fpl.first_name} ${fpl.second_name}`)
  const fplWeb = normalizeName(fpl.web_name)
  return fplFull.includes(sdbLast) || fplWeb.includes(sdbLast)
}

export type PlayerMatchResult = {
  matches: PlayerMatch[]
  unmatchedSdb: SportsDbPlayer[]
}

/**
 * Match one team's SportsDB squad against that team's FPL roster.
 * Pass 1: date-of-birth match (with a weak name check to catch shared DOBs).
 * Pass 2: name similarity for the remainder.
 * Each FPL player is assigned at most once.
 */
export function matchPlayers(
  fplPlayers: readonly EnrichmentFplElement[],
  sdbPlayers: readonly SportsDbPlayer[]
): PlayerMatchResult {
  const matches: PlayerMatch[] = []
  const usedCodes = new Set<number>()
  const remainingSdb: SportsDbPlayer[] = []

  // Pass 1: DOB.
  for (const sdb of sdbPlayers) {
    if (!sdb.dateBorn) {
      remainingSdb.push(sdb)
      continue
    }
    const dobCandidates = fplPlayers.filter(
      (fpl) =>
        !usedCodes.has(fpl.code) &&
        fpl.birth_date !== null &&
        fpl.birth_date === sdb.dateBorn
    )

    let matched: EnrichmentFplElement | null = null
    if (dobCandidates.length === 1) {
      // Unique DOB within the squad: accept with a sanity check for
      // completely unrelated names (bad data), which we let through only
      // when there is some name overlap.
      matched =
        sharesLastName(sdb, dobCandidates[0]) ||
        bestNameSimilarity(sdb, dobCandidates[0]) >= 0.5
          ? dobCandidates[0]
          : null
    } else if (dobCandidates.length > 1) {
      // Shared birthday: pick the closest name if it clears a bar.
      const scored = dobCandidates
        .map((fpl) => ({ fpl, score: bestNameSimilarity(sdb, fpl) }))
        .sort((a, b) => b.score - a.score)
      matched = scored[0].score >= 0.5 ? scored[0].fpl : null
    }

    if (matched) {
      matches.push({
        playerCode: matched.code,
        webName: matched.web_name,
        sportsdbId: Number(sdb.idPlayer),
        method: "dob+name",
        player: sdb,
      })
      usedCodes.add(matched.code)
    } else {
      remainingSdb.push(sdb)
    }
  }

  // Pass 2: name similarity.
  const unmatchedSdb: SportsDbPlayer[] = []
  for (const sdb of remainingSdb) {
    let best: EnrichmentFplElement | null = null
    let bestScore = 0

    for (const fpl of fplPlayers) {
      if (usedCodes.has(fpl.code)) {
        continue
      }
      const score = bestNameSimilarity(sdb, fpl)
      if (score > bestScore) {
        bestScore = score
        best = fpl
      }
    }

    if (best && bestScore >= NAME_SIMILARITY_THRESHOLD) {
      matches.push({
        playerCode: best.code,
        webName: best.web_name,
        sportsdbId: Number(sdb.idPlayer),
        method: "name",
        player: sdb,
      })
      usedCodes.add(best.code)
    } else {
      unmatchedSdb.push(sdb)
    }
  }

  return { matches, unmatchedSdb }
}
