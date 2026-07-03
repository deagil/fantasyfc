import { createServerFn } from "@tanstack/react-start"

export const getAuthUser = createServerFn({ method: "GET" }).handler(async () => {
  const { getServerAuthUser } = await import("@/lib/auth/auth.server")
  return getServerAuthUser()
})

export const verifyOtpServer = createServerFn({ method: "POST" })
  .validator((data: { email: string; token: string }) => data)
  .handler(async ({ data }) => {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({
      email: data.email,
      token: data.token,
      type: "email",
    })

    return { ok: !error }
  })

export const signOutServer = createServerFn({ method: "POST" }).handler(async () => {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server")
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()
})
