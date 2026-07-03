import "@tanstack/react-start/server-only"

import { createServiceRoleClient } from "@/lib/supabase/admin"

/** Users created before profiles migration may lack a row; FKs require one. */
export async function ensureUserProfile(userId: string) {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true })

  if (error) {
    throw new Error(`Failed to ensure user profile: ${error.message}`)
  }
}
