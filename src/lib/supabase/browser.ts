import { createBrowserClient } from "@supabase/ssr"

import { getBrowserSupabaseEnv } from "@/lib/supabase/env"

let client: ReturnType<typeof createBrowserClient> | null = null

export function createBrowserSupabaseClient() {
  const { url, anonKey } = getBrowserSupabaseEnv()
  client ??= createBrowserClient(url, anonKey)
  return client
}
