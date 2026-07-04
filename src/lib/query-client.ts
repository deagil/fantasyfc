import { QueryClient } from "@tanstack/react-query"

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 24 * 60 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return createAppQueryClient()
  }

  if (!browserQueryClient) {
    browserQueryClient = createAppQueryClient()
  }

  return browserQueryClient
}
