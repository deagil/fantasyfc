import "@tanstack/react-start/server-only"

import { createServiceRoleClient } from "@/lib/supabase/admin"

const PENDING_TTL_MS = 10 * 60 * 1000

export async function saveSpotifyOAuthPending(
  userId: string,
  data: { state: string; codeVerifier: string; appOrigin: string }
) {
  const supabase = createServiceRoleClient()
  const expiresBefore = new Date(Date.now() - PENDING_TTL_MS).toISOString()

  await supabase
    .from("integration_oauth_pending")
    .delete()
    .eq("user_id", userId)
    .lt("created_at", expiresBefore)

  const { error } = await supabase.from("integration_oauth_pending").insert({
    state: data.state,
    user_id: userId,
    code_verifier: data.codeVerifier,
    app_origin: data.appOrigin,
  })

  if (error) {
    throw new Error(`Failed to store Spotify OAuth state: ${error.message}`)
  }
}

export async function consumeSpotifyOAuthPending(
  userId: string,
  state: string
): Promise<{ codeVerifier: string; appOrigin: string } | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("integration_oauth_pending")
    .select("code_verifier, app_origin")
    .eq("user_id", userId)
    .eq("state", state)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  await supabase.from("integration_oauth_pending").delete().eq("state", state)

  return {
    codeVerifier: data.code_verifier,
    appOrigin: data.app_origin,
  }
}
