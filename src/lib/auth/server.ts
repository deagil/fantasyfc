import { createServerFn } from "@tanstack/react-start"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { AuthUser, Profile } from "@/lib/auth/types"

/**
 * Plain (non-createServerFn) helper for other server functions to call
 * within their own handlers, sharing the same request-bound cookie context.
 */
export async function getServerAuthUser(): Promise<{
  user: AuthUser
  profile: Profile | null
} | null> {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return {
    user: { id: user.id, email: user.email ?? null } satisfies AuthUser,
    profile: (profile as Profile | null) ?? null,
  }
}

/** Throws if the current request has no logged-in Supabase user. */
export async function requireServerAuthUser(): Promise<AuthUser> {
  const result = await getServerAuthUser()
  if (!result) {
    throw new Error("Not authenticated")
  }
  return result.user
}

export const getAuthUser = createServerFn({ method: "GET" }).handler(
  async () => getServerAuthUser()
)

export const signOutServer = createServerFn({ method: "POST" }).handler(
  async () => {
    const supabase = createServerSupabaseClient()
    await supabase.auth.signOut()
  }
)
