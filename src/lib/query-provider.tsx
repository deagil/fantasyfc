import { useState } from "react"
import type { Query } from "@tanstack/react-query"
import { QueryClientProvider } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"

import { createAppQueryClient } from "@/lib/query-client"
import { fplKeys } from "@/lib/fpl/queries"

const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000

function shouldPersistQuery(query: Query): boolean {
  const key = query.queryKey
  if (key[0] !== fplKeys.all[0]) {
    return false
  }

  const resource = key[1]
  return (
    resource === "bootstrap" ||
    resource === "fixtures" ||
    resource === "history" ||
    resource === "standings"
  )
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createAppQueryClient())

  if (typeof window === "undefined") {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: "deadline-query-cache",
  })

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE,
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
