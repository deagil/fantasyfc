import "@tanstack/react-start/server-only"

import { createServerClient } from "@supabase/ssr"
import { getCookies, setCookie } from "@tanstack/react-start/server"

import { getServerSupabasePublicEnv } from "@/lib/supabase/env"

export function createServerSupabaseClient() {
  const { url, anonKey } = getServerSupabasePublicEnv()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        const cookies = getCookies()
        return Object.entries(cookies).map(([name, value]) => ({
          name,
          value,
        }))
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(name, value, options)
        }
      },
    },
  })
}
