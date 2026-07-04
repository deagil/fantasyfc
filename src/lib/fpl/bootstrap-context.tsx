import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react"
import { useQueryClient } from "@tanstack/react-query"

import {
  useFplBootstrapQuery,
  useFplFixturesQuery,
} from "@/lib/fpl/hooks"
import { invalidateFplSeasonQueries } from "@/lib/fpl/queries"
import type { FplBootstrap, FplFixture } from "@/lib/fpl/types"

type FplBootstrapContextValue = {
  bootstrap: FplBootstrap | null
  fixtures: FplFixture[]
  teamsById: Map<number, FplBootstrap["teams"][number]>
  elementsById: Map<number, FplBootstrap["elements"][number]>
  isLoading: boolean
  error: string | null
  refreshBootstrap: () => Promise<void>
}

const FplBootstrapContext = createContext<FplBootstrapContextValue | null>(null)

function getQueryErrorMessage(error: unknown): string | null {
  if (!error) {
    return null
  }

  return "Could not load gameweek data."
}

export function FplBootstrapProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const bootstrapQuery = useFplBootstrapQuery()
  const fixturesQuery = useFplFixturesQuery(bootstrapQuery.data, {
    enabled: !!bootstrapQuery.data,
  })

  const bootstrap = bootstrapQuery.data ?? null
  const fixtures = fixturesQuery.data ?? []

  const isLoading =
    bootstrapQuery.isPending ||
    (bootstrap !== null && fixturesQuery.isPending && fixtures.length === 0)

  const error =
    getQueryErrorMessage(bootstrapQuery.error) ??
    getQueryErrorMessage(fixturesQuery.error)

  const teamsById = useMemo(() => {
    const map = new Map<number, FplBootstrap["teams"][number]>()
    for (const team of bootstrap?.teams ?? []) {
      map.set(team.id, team)
    }
    return map
  }, [bootstrap])

  const elementsById = useMemo(() => {
    const map = new Map<number, FplBootstrap["elements"][number]>()
    for (const element of bootstrap?.elements ?? []) {
      map.set(element.id, element)
    }
    return map
  }, [bootstrap])

  const refreshBootstrap = useCallback(async () => {
    await invalidateFplSeasonQueries(queryClient)
  }, [queryClient])

  const value = useMemo(
    () => ({
      bootstrap,
      fixtures,
      teamsById,
      elementsById,
      isLoading,
      error,
      refreshBootstrap,
    }),
    [
      bootstrap,
      fixtures,
      teamsById,
      elementsById,
      isLoading,
      error,
      refreshBootstrap,
    ]
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
