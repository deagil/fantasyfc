import { describe, expect, it } from "vitest"

import type {
  EnginePlayer,
  FplHistoryPastSeason,
  SeasonHistoryInput,
} from "@/lib/ratings/model"
import {
  BOOTSTRAP_HISTORY_FALLBACK_STAT_KEYS,
  fillDeadBootstrapStatsFromHistory,
} from "@/lib/ratings/stats"

function historyStats(
  partial: Partial<FplHistoryPastSeason> = {}
): FplHistoryPastSeason {
  return {
    season_name: "2025/26",
    element_code: 1,
    start_cost: 50,
    end_cost: 50,
    total_points: 100,
    minutes: 2700,
    goals_scored: 2,
    assists: 1,
    clean_sheets: 10,
    goals_conceded: 30,
    own_goals: 0,
    penalties_saved: 0,
    penalties_missed: 0,
    yellow_cards: 3,
    red_cards: 0,
    saves: 0,
    bonus: 8,
    bps: 400,
    influence: "0",
    creativity: "0",
    threat: "0",
    ict_index: "0",
    clearances_blocks_interceptions: 120,
    recoveries: 80,
    tackles: 40,
    defensive_contribution: 200,
    starts: 30,
    expected_goals: "2.0",
    expected_assists: "1.0",
    expected_goal_involvements: "3.0",
    expected_goals_conceded: "28.0",
    ...partial,
  }
}

function player(
  id: number,
  stats: Record<string, number | null>,
  minutes = 2700
): EnginePlayer {
  return {
    id,
    code: id,
    webName: `P${id}`,
    elementType: 2,
    minutes,
    stats,
  }
}

function historyRow(
  code: number,
  seasonName: string,
  stats: Partial<FplHistoryPastSeason> = {}
): SeasonHistoryInput {
  return {
    playerCode: code,
    webName: `P${code}`,
    elementType: 2,
    seasonName,
    stats: historyStats({
      season_name: seasonName,
      element_code: code,
      ...stats,
    }),
  }
}

describe("fillDeadBootstrapStatsFromHistory", () => {
  it("fills DEF Actions from the latest history season when bootstrap has no variance", () => {
    const players = Array.from({ length: 10 }, (_, index) =>
      player(index + 1, {
        defcon_per_90: 0,
        cbi_per_90: 0,
        tackles_per_90: 0,
        recoveries_per_90: 0,
        yellow_per_90: 0.1 * (index + 1),
      })
    )
    const history = players.map((entry) =>
      historyRow(entry.code, "2025/26", {
        clearances_blocks_interceptions: 90 + entry.code * 10,
        tackles: 20 + entry.code,
        recoveries: 50 + entry.code * 2,
        defensive_contribution: 150 + entry.code * 5,
        minutes: 2700,
      })
    )

    const filled = fillDeadBootstrapStatsFromHistory(players, history)

    for (const key of BOOTSTRAP_HISTORY_FALLBACK_STAT_KEYS) {
      const values = filled.map((entry) => entry.stats[key])
      expect(values.every((value) => value != null && value > 0)).toBe(true)
      expect(new Set(values).size).toBeGreaterThan(1)
    }
    // Unrelated stats stay untouched.
    expect(filled[0]?.stats.yellow_per_90).toBe(0.1)
  })

  it("leaves bootstrap Actions alone once the cohort has real variance", () => {
    const players = Array.from({ length: 10 }, (_, index) =>
      player(index + 1, {
        defcon_per_90: 1 + index,
        cbi_per_90: 2 + index,
        tackles_per_90: 0.5 + index * 0.1,
        recoveries_per_90: 3 + index,
      })
    )
    const history = players.map((entry) =>
      historyRow(entry.code, "2025/26", {
        defensive_contribution: 999,
        clearances_blocks_interceptions: 999,
        tackles: 999,
        recoveries: 999,
      })
    )

    const filled = fillDeadBootstrapStatsFromHistory(players, history)

    expect(filled[0]?.stats.defcon_per_90).toBe(1)
    expect(filled[9]?.stats.cbi_per_90).toBe(11)
  })

  it("prefers the most recent history season when several exist", () => {
    const players = Array.from({ length: 10 }, (_, index) =>
      player(index + 1, {
        defcon_per_90: 0,
        cbi_per_90: 0,
        tackles_per_90: 0,
        recoveries_per_90: 0,
      })
    )
    const history = [
      historyRow(1, "2024/25", {
        defensive_contribution: 90,
        clearances_blocks_interceptions: 90,
        tackles: 90,
        recoveries: 90,
        minutes: 2700,
      }),
      historyRow(1, "2025/26", {
        defensive_contribution: 270,
        clearances_blocks_interceptions: 180,
        tackles: 45,
        recoveries: 90,
        minutes: 2700,
      }),
      ...players.slice(1).map((entry) =>
        historyRow(entry.code, "2025/26", {
          defensive_contribution: 100 + entry.code,
          clearances_blocks_interceptions: 80 + entry.code,
          tackles: 30 + entry.code,
          recoveries: 40 + entry.code,
          minutes: 2700,
        })
      ),
    ]

    const filled = fillDeadBootstrapStatsFromHistory(players, history)
    // 270 defcon over 2700 minutes → 9.0 / 90
    expect(filled[0]?.stats.defcon_per_90).toBeCloseTo(9, 5)
    expect(filled[0]?.stats.cbi_per_90).toBeCloseTo(6, 5)
  })
})
