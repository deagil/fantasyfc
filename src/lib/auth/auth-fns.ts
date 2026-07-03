import { createServerFn } from "@tanstack/react-start"

export const getAuthUser = createServerFn({ method: "GET" }).handler(async () => {
  const { getServerAuthUser } = await import("@/lib/auth/auth.server")
  return getServerAuthUser()
})

export const verifyOtpServer = createServerFn({ method: "POST" })
  .validator((data: { email: string; token: string }) => data)
  .handler(async ({ data }) => {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const { ensureUserProfile } = await import("@/lib/auth/profile.server")
    const supabase = createServerSupabaseClient()
    const { data: session, error } = await supabase.auth.verifyOtp({
      email: data.email,
      token: data.token,
      type: "email",
    })

    if (error || !session.user) {
      return { ok: false as const }
    }

    await ensureUserProfile(session.user.id)
    return { ok: true as const }
  })

export const signOutServer = createServerFn({ method: "POST" }).handler(async () => {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server")
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()
})
