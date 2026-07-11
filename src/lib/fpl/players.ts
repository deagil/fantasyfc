import type { FplElement, FplElementTypeId, FplTeam } from "@/lib/fpl/types"
import { formatBankBalance } from "@/lib/fpl/transfers"

export type PositionFilterId = "all" | "GKP" | "DEF" | "MID" | "FWD"

export const POSITION_FILTERS: PositionFilterId[] = [
  "all",
  "FWD",
  "MID",
  "DEF",
  "GKP",
]

const ELEMENT_TYPE_LABELS: Record<FplElementTypeId, Exclude<PositionFilterId, "all">> = {
  1: "GKP",
  2: "DEF",
  3: "MID",
  4: "FWD",
}

const POSITION_FILTER_TO_ELEMENT_TYPE: Record<
  Exclude<PositionFilterId, "all">,
  FplElementTypeId
> = {
  GKP: 1,
  DEF: 2,
  MID: 3,
  FWD: 4,
}

export function getElementTypeLabel(elementType: FplElementTypeId): string {
  return ELEMENT_TYPE_LABELS[elementType]
}

export function formatPlayerPrice(nowCost: number): string {
  return formatBankBalance(nowCost)
}

export function formatPlayerOwnership(selectedByPercent: string): string {
  const value = Number.parseFloat(selectedByPercent)
  if (!Number.isFinite(value)) {
    return "—"
  }

  return `${value.toFixed(1)}%`
}

export function formatPlayerForm(form: string): string {
  const value = Number.parseFloat(form)
  if (!Number.isFinite(value)) {
    return "—"
  }

  return value.toFixed(1)
}

export function formatPlayerStatus(status: FplElement["status"]): string {
  switch (status) {
    case "a":
      return "Available"
    case "d":
      return "Doubtful"
    case "i":
      return "Injured"
    case "n":
      return "Not in squad"
    case "s":
      return "Suspended"
    case "u":
      return "Unavailable"
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function isPositionFilterId(value: string): value is PositionFilterId {
  return POSITION_FILTERS.includes(value as PositionFilterId)
}

export function filterPlayersByPosition(
  players: FplElement[],
  filter: PositionFilterId
): FplElement[] {
  if (filter === "all") {
    return players
  }

  const elementType = POSITION_FILTER_TO_ELEMENT_TYPE[filter]
  return players.filter((player) => player.element_type === elementType)
}

export function sortPlayersByPoints(players: FplElement[]): FplElement[] {
  return [...players].sort((left, right) => {
    if (right.total_points !== left.total_points) {
      return right.total_points - left.total_points
    }

    return left.web_name.localeCompare(right.web_name)
  })
}

export function sortPlayersByBonus(players: FplElement[]): FplElement[] {
  return [...players].sort((left, right) => {
    if (right.bonus !== left.bonus) {
      return right.bonus - left.bonus
    }
    if (right.total_points !== left.total_points) {
      return right.total_points - left.total_points
    }

    return left.web_name.localeCompare(right.web_name)
  })
}

export function getPlayerInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) {
    return "?"
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

export function getPlayerClubShortName(
  player: FplElement,
  teamsById: Map<number, FplTeam>
): string {
  return teamsById.get(player.team)?.short_name ?? "—"
}
