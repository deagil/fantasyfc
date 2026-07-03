import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useServerFn } from "@tanstack/react-start"

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

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const getEntry = useServerFn(getFplEntry)
  const getHistory = useServerFn(getFplEntryHistory)
  const [teamId, setTeamIdState] = useState<number | null>(null)
  const [entry, setEntry] = useState<FplEntry | null>(null)
  const [history, setHistory] = useState<FplEntryHistory | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTeam = useCallback(
    async (nextTeamId: number) => {
      setIsLoading(true)
      setError(null)

      try {
        const [nextEntry, nextHistory] = await Promise.all([
          getEntry({ data: { teamId: nextTeamId } }),
          getHistory({ data: { teamId: nextTeamId } }),
        ])
        setEntry(nextEntry)
        setHistory(nextHistory)
      } catch {
        setEntry(null)
        setHistory(null)
        setError("Could not load team. Check the team ID and try again.")
      } finally {
        setIsLoading(false)
      }
    },
    [getEntry, getHistory]
  )

  useEffect(() => {
    const storedTeamId = getStoredTeamId()
    if (!storedTeamId) {
      return
    }

    setTeamIdState(storedTeamId)
    void loadTeam(storedTeamId)
  }, [loadTeam])

  const setTeamId = useCallback(
    async (nextTeamId: number) => {
      setStoredTeamId(nextTeamId)
      setTeamIdState(nextTeamId)
      setIsLoading(true)
      setError(null)

      try {
        const [nextEntry, nextHistory] = await Promise.all([
          getEntry({ data: { teamId: nextTeamId } }),
          getHistory({ data: { teamId: nextTeamId } }),
        ])
        setEntry(nextEntry)
        setHistory(nextHistory)
        return true
      } catch {
        setStoredTeamId(null)
        setTeamIdState(null)
        setEntry(null)
        setHistory(null)
        setError("Could not load team. Check the team ID and try again.")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getEntry, getHistory]
  )

  const clearTeam = useCallback(() => {
    setStoredTeamId(null)
    setTeamIdState(null)
    setEntry(null)
    setHistory(null)
    setError(null)
    setIsLoading(false)
  }, [])

  const refreshEntry = useCallback(async () => {
    if (!teamId) {
      return
    }

    await loadTeam(teamId)
  }, [loadTeam, teamId])

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
    [teamId, entry, history, isLoading, error, setTeamId, clearTeam, refreshEntry]
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
