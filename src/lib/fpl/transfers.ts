import type { FplEntry, FplEntryHistory, FplGameweekHistory } from "@/lib/fpl/types"

const MAX_BANKED_FREE_TRANSFERS = 5

export type PublicTransferSummary = {
  bank: number
  freeTransfers: number
}

export function formatBankBalance(tenths: number): string {
  return `£${(tenths / 10).toFixed(1)}m`
}

const SEASON_STARTING_SQUAD_VALUE_TENTHS = 1000

export function formatTeamProfit(teamValueTenths: number): string {
  const profitMillions =
    (teamValueTenths - SEASON_STARTING_SQUAD_VALUE_TENTHS) / 10

  if (profitMillions === 0) {
    return "+0.0m"
  }

  if (profitMillions > 0) {
    return `+${profitMillions.toFixed(1)}m`
  }

  return profitMillions.toFixed(1)
}

export function formatFreeTransfers(freeTransfers: number): string {
  if (freeTransfers === 1) {
    return "1 free transfer"
  }

  return `${freeTransfers} free transfers`
}

export function getBankBalance(
  entry: FplEntry,
  history: FplEntryHistory | null
): number {
  const currentGameweek = history?.current.find(
    (gameweek) => gameweek.event === entry.current_event
  )
  if (currentGameweek) {
    return currentGameweek.bank
  }

  const latestGameweek = history?.current.at(-1)
  if (latestGameweek) {
    return latestGameweek.bank
  }

  return entry.last_deadline_bank
}

export function getFreeTransfersFromHistory(
  gameweeks: FplGameweekHistory[],
  currentEvent: number
): number {
  const completedGameweeks = gameweeks
    .filter((gameweek) => gameweek.event < currentEvent)
    .sort((a, b) => a.event - b.event)

  let freeTransfers = 0

  for (const gameweek of completedGameweeks) {
    freeTransfers = Math.min(MAX_BANKED_FREE_TRANSFERS, freeTransfers + 1)
    freeTransfers = Math.max(0, freeTransfers - gameweek.event_transfers)
  }

  return Math.min(MAX_BANKED_FREE_TRANSFERS, freeTransfers + 1)
}

export function getPublicTransferSummary(
  entry: FplEntry,
  history: FplEntryHistory | null
): PublicTransferSummary {
  return {
    bank: getBankBalance(entry, history),
    freeTransfers: history
      ? getFreeTransfersFromHistory(history.current, entry.current_event)
      : 1,
  }
}
