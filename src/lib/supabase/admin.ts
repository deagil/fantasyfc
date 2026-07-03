import "@tanstack/react-start/server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@supabase/supabase-js"

import { getServerSupabasePublicEnv } from "@/lib/supabase/env"

let client: SupabaseClient | null = null

export function createServiceRoleClient() {
  const { url } = getServerSupabasePublicEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for service-role Supabase access."
    )
  }

  client ??= createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return client
}
