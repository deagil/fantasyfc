import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useServerFn } from "@tanstack/react-start"

import { getFplBootstrap, getFplFixtures } from "@/lib/fpl/server"
import type { FplBootstrap, FplFixture } from "@/lib/fpl/types"

type FplBootstrapContextValue = {
  bootstrap: FplBootstrap | null
  fixtures: FplFixture[]
  teamsById: Map<number, FplBootstrap["teams"][number]>
  isLoading: boolean
  error: string | null
  refreshBootstrap: () => Promise<void>
}

const FplBootstrapContext = createContext<FplBootstrapContextValue | null>(null)

function getFixtureEventIds(bootstrap: FplBootstrap): number[] {
  const currentEvent = bootstrap.events.find((event) => event.is_current)
  const nextEvent = bootstrap.events.find((event) => event.is_next)
  const ids = new Set<number>()

  if (currentEvent) {
    ids.add(currentEvent.id)
  }

  if (nextEvent) {
    ids.add(nextEvent.id)
  }

  if (ids.size === 0) {
    const lastEvent = bootstrap.events.at(-1)
    if (lastEvent) {
      ids.add(lastEvent.id)
    }
  }

  return [...ids]
}

export function FplBootstrapProvider({ children }: { children: React.ReactNode }) {
  const fetchBootstrap = useServerFn(getFplBootstrap)
  const fetchFixtures = useServerFn(getFplFixtures)
  const [bootstrap, setBootstrap] = useState<FplBootstrap | null>(null)
  const [fixtures, setFixtures] = useState<FplFixture[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBootstrap = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const nextBootstrap = await fetchBootstrap()
      setBootstrap(nextBootstrap)

      const eventIds = getFixtureEventIds(nextBootstrap)
      const fixtureGroups = await Promise.all(
        eventIds.map((eventId) => fetchFixtures({ data: { event: eventId } }))
      )
      setFixtures(fixtureGroups.flat())
    } catch {
      setBootstrap(null)
      setFixtures([])
      setError("Could not load gameweek data.")
    } finally {
      setIsLoading(false)
    }
  }, [fetchBootstrap, fetchFixtures])

  useEffect(() => {
    void loadBootstrap()
  }, [loadBootstrap])

  const teamsById = useMemo(() => {
    const map = new Map<number, FplBootstrap["teams"][number]>()
    for (const team of bootstrap?.teams ?? []) {
      map.set(team.id, team)
    }
    return map
  }, [bootstrap])

  const value = useMemo(
    () => ({
      bootstrap,
      fixtures,
      teamsById,
      isLoading,
      error,
      refreshBootstrap: loadBootstrap,
    }),
    [bootstrap, fixtures, teamsById, isLoading, error, loadBootstrap]
  )

  return (
    <FplBootstrapContext.Provider value={value}>
      {children}
    </FplBootstrapContext.Provider>
  )
}

export function useFplBootstrap() {
  const context = useContext(FplBootstrapContext)
  if (!context) {
    throw new Error("useFplBootstrap must be used within FplBootstrapProvider")
  }
  return context
}
