import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { useMediaQuery } from "@/hooks/use-media-query"
import type { FplClassicLeague } from "@/lib/fpl/types"

type LeaguesInspectorContextValue = {
  selectedLeague: FplClassicLeague | null
  isOpen: boolean
  selectLeague: (league: FplClassicLeague) => void
  closeInspector: () => void
}

const LeaguesInspectorContext =
  createContext<LeaguesInspectorContextValue | null>(null)

export function LeaguesInspectorProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const [selectedLeague, setSelectedLeague] =
    useState<FplClassicLeague | null>(null)

  const isOpen = isDesktop && selectedLeague !== null

  useEffect(() => {
    if (isOpen) {
      document.documentElement.dataset.leaguesInspectorOpen = "true"
    } else {
      delete document.documentElement.dataset.leaguesInspectorOpen
    }

    return () => {
      delete document.documentElement.dataset.leaguesInspectorOpen
    }
  }, [isOpen])

  useEffect(() => {
    if (!isDesktop) {
      setSelectedLeague(null)
    }
  }, [isDesktop])

  const selectLeague = useCallback((league: FplClassicLeague) => {
    setSelectedLeague(league)
  }, [])

  const closeInspector = useCallback(() => {
    setSelectedLeague(null)
  }, [])

  const value = useMemo(
    () => ({
      selectedLeague,
      isOpen,
      selectLeague,
      closeInspector,
    }),
    [selectedLeague, isOpen, selectLeague, closeInspector]
  )

  return (
    <LeaguesInspectorContext.Provider value={value}>
      {children}
    </LeaguesInspectorContext.Provider>
  )
}

export function useLeaguesInspector() {
  const context = useContext(LeaguesInspectorContext)
  if (!context) {
    throw new Error(
      "useLeaguesInspector must be used within LeaguesInspectorProvider"
    )
  }
  return context
}
