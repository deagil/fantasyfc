import { createServerFn } from "@tanstack/react-start"

export const getAuthUser = createServerFn({ method: "GET" }).handler(async () => {
  const { getServerAuthUser } = await import("@/lib/auth/auth.server")
  return getServerAuthUser()
})

export const signOutServer = createServerFn({ method: "POST" }).handler(async () => {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server")
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()
})
