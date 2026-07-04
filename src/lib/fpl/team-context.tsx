import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"

import { useFplEntryQuery, useFplHistoryQuery } from "@/lib/fpl/hooks"
import {
  invalidateFplTeamQueries,
  removeFplTeamQueries,
  fplKeys,
} from "@/lib/fpl/queries"
import { getFplEntry, getFplEntryHistory } from "@/lib/fpl/server"
import { getStoredTeamId, setStoredTeamId } from "@/lib/fpl/storage"
import type { FplEntry, FplEntryHistory } from "@/lib/fpl/types"

type TeamContextValue = {
  teamId: number | null
  entry: FplEntry | null
  history: FplEntryHistory | null
  isLoggedIn: boolean
  isLoading: boolean
  error: string | null
  setTeamId: (teamId: number) => Promise<boolean>
  clearTeam: () => void
  refreshEntry: () => Promise<void>
}

const TeamContext = createContext<TeamContextValue | null>(null)

function getQueryErrorMessage(error: unknown): string | null {
  if (!error) {
    return null
  }

  return "Could not load team. Check the team ID and try again."
}

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const fetchEntry = useServerFn(getFplEntry)
  const fetchHistory = useServerFn(getFplEntryHistory)
  const [teamId, setTeamIdState] = useState<number | null>(null)
  const [isSettingTeam, setIsSettingTeam] = useState(false)
  const [setTeamError, setSetTeamError] = useState<string | null>(null)

  useEffect(() => {
    const storedTeamId = getStoredTeamId()
    if (storedTeamId) {
      setTeamIdState(storedTeamId)
    }
  }, [])

  const entryQuery = useFplEntryQuery(teamId)
  const historyQuery = useFplHistoryQuery(teamId)

  const entry = entryQuery.data ?? null
  const history = historyQuery.data ?? null

  const isLoading =
    isSettingTeam ||
    (teamId !== null &&
      ((entryQuery.isPending && !entryQuery.data) ||
        (historyQuery.isPending && !historyQuery.data)))

  const error =
    setTeamError ??
    getQueryErrorMessage(entryQuery.error) ??
    getQueryErrorMessage(historyQuery.error)

  const setTeamId = useCallback(
    async (nextTeamId: number) => {
      const previousTeamId = teamId
      setIsSettingTeam(true)
      setSetTeamError(null)
      setStoredTeamId(nextTeamId)
      setTeamIdState(nextTeamId)

      try {
        await Promise.all([
          queryClient.fetchQuery({
            queryKey: fplKeys.entry(nextTeamId),
            queryFn: () => fetchEntry({ data: { teamId: nextTeamId } }),
          }),
          queryClient.fetchQuery({
            queryKey: fplKeys.history(nextTeamId),
            queryFn: () => fetchHistory({ data: { teamId: nextTeamId } }),
          }),
        ])

        if (previousTeamId !== null && previousTeamId !== nextTeamId) {
          removeFplTeamQueries(queryClient, previousTeamId)
        }

        return true
      } catch {
        removeFplTeamQueries(queryClient, nextTeamId)
        setStoredTeamId(previousTeamId)
        setTeamIdState(previousTeamId)
        setSetTeamError("Could not load team. Check the team ID and try again.")
        return false
      } finally {
        setIsSettingTeam(false)
      }
    },
    [fetchEntry, fetchHistory, queryClient, teamId]
  )

  const clearTeam = useCallback(() => {
    if (teamId !== null) {
      removeFplTeamQueries(queryClient, teamId)
    }

    setStoredTeamId(null)
    setTeamIdState(null)
    setSetTeamError(null)
    setIsSettingTeam(false)
  }, [queryClient, teamId])

  const refreshEntry = useCallback(async () => {
    if (!teamId) {
      return
    }

    await invalidateFplTeamQueries(queryClient, teamId)
  }, [queryClient, teamId])

  const value = useMemo(
    () => ({
      teamId,
      entry,
      history,
      isLoggedIn: teamId !== null,
      isLoading,
      error,
      setTeamId,
      clearTeam,
      refreshEntry,
    }),
    [
      teamId,
      entry,
      history,
      isLoading,
      error,
      setTeamId,
      clearTeam,
      refreshEntry,
    ]
  )

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useTeam() {
  const context = useContext(TeamContext)
  if (!context) {
    throw new Error("useTeam must be used within TeamProvider")
  }
  return context
}
