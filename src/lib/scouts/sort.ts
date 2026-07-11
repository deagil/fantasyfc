import {
  filterPlayersByPosition,
  sortPlayersByBonus,
  sortPlayersByPoints,
} from "@/lib/fpl/players"
import type { FplElement } from "@/lib/fpl/types"
import type { PlayerRatingSummary } from "@/lib/ratings/model"
import type { ScoutPreset, ScoutSortId } from "@/lib/scouts/presets"

export function getGoalInvolvements(player: FplElement): number {
  return player.goals_scored + player.assists
}

/** Goals + assists per 90; 0 when the player has no minutes. */
export function getGoalInvolvementsPer90(player: FplElement): number {
  if (player.minutes <= 0) {
    return 0
  }
  return (getGoalInvolvements(player) * 90) / player.minutes
}

export function getPlayerOwnershipPercent(player: FplElement): number {
  const value = Number.parseFloat(player.selected_by_percent)
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

/** Price in £m (FPL stores cost in tenths). */
export function getPlayerPriceMillions(player: FplElement): number {
  return player.now_cost / 10
}

export function filterPlayersForScout(
  players: readonly FplElement[],
  scout: ScoutPreset
): FplElement[] {
  let filtered = filterPlayersByPosition([...players], scout.positionFilter)

  if (scout.maxOwnership != null) {
    filtered = filtered.filter(
      (player) => getPlayerOwnershipPercent(player) < scout.maxOwnership!
    )
  }

  if (scout.maxPriceMillions != null) {
    // Inclusive upper bound: "under £6.0m" includes £6.0m players.
    filtered = filtered.filter(
      (player) => getPlayerPriceMillions(player) <= scout.maxPriceMillions!
    )
  }

  if (scout.maxMinutes != null) {
    filtered = filtered.filter((player) => player.minutes <= scout.maxMinutes!)
  }

  if (scout.maxStarts != null) {
    filtered = filtered.filter((player) => player.starts <= scout.maxStarts!)
  }

  if (scout.minGoalInvolvements != null) {
    filtered = filtered.filter(
      (player) => getGoalInvolvements(player) >= scout.minGoalInvolvements!
    )
  }

  if (scout.minDefensiveContribution != null) {
    filtered = filtered.filter(
      (player) =>
        (player.defensive_contribution ?? 0) >= scout.minDefensiveContribution!
    )
  }

  return filtered
}

function sortByOverall(
  players: FplElement[],
  ratingsById?: Map<number, PlayerRatingSummary>
): FplElement[] {
  if (!ratingsById || ratingsById.size === 0) {
    return sortPlayersByPoints(players)
  }

  return [...players].sort((left, right) => {
    const leftOverall = ratingsById.get(left.id)?.overall ?? 0
    const rightOverall = ratingsById.get(right.id)?.overall ?? 0
    if (rightOverall !== leftOverall) {
      return rightOverall - leftOverall
    }
    return left.web_name.localeCompare(right.web_name)
  })
}

function sortByDefcon(players: FplElement[]): FplElement[] {
  return [...players].sort((left, right) => {
    const leftDc = left.defensive_contribution ?? 0
    const rightDc = right.defensive_contribution ?? 0
    if (rightDc !== leftDc) {
      return rightDc - leftDc
    }
    if (right.total_points !== left.total_points) {
      return right.total_points - left.total_points
    }
    return left.web_name.localeCompare(right.web_name)
  })
}

function sortByGoalInvolvements(players: FplElement[]): FplElement[] {
  return [...players].sort((left, right) => {
    const leftGi = getGoalInvolvements(left)
    const rightGi = getGoalInvolvements(right)
    if (rightGi !== leftGi) {
      return rightGi - leftGi
    }
    if (right.total_points !== left.total_points) {
      return right.total_points - left.total_points
    }
    return left.web_name.localeCompare(right.web_name)
  })
}

function sortByGiPer90(players: FplElement[]): FplElement[] {
  return [...players].sort((left, right) => {
    const leftRate = getGoalInvolvementsPer90(left)
    const rightRate = getGoalInvolvementsPer90(right)
    if (rightRate !== leftRate) {
      return rightRate - leftRate
    }
    const leftGi = getGoalInvolvements(left)
    const rightGi = getGoalInvolvements(right)
    if (rightGi !== leftGi) {
      return rightGi - leftGi
    }
    return left.web_name.localeCompare(right.web_name)
  })
}

export function sortPlayersForScout(
  players: readonly FplElement[],
  scout: ScoutPreset,
  ratingsById?: Map<number, PlayerRatingSummary>
): FplElement[] {
  const filtered = filterPlayersForScout(players, scout)

  switch (scout.sort) {
    case "overall":
      return sortByOverall(filtered, ratingsById)
    case "bonus":
      return sortPlayersByBonus(filtered)
    case "defcon":
      return sortByDefcon(filtered)
    case "goal_involvements":
      return sortByGoalInvolvements(filtered)
    case "gi_per_90":
      return sortByGiPer90(filtered)
    case "points":
      return sortPlayersByPoints(filtered)
    default: {
      const _exhaustive: never = scout.sort
      return _exhaustive
    }
  }
}

export function scoutNeedsRatings(_sort: ScoutSortId): boolean {
  // Scout rows always show overall rating, so every report needs ratings.
  return true
}

/** Overall rating shown on scout cards (sort metric is list order only). */
export function getScoutCardScore(
  player: FplElement,
  _scout: ScoutPreset,
  ratingsById?: Map<number, PlayerRatingSummary>
): number | null {
  return ratingsById?.get(player.id)?.overall ?? null
}
