import { createServerFn } from "@tanstack/react-start"

import { requireServerAuthUser } from "@/lib/auth/server"
import { getValidConnection } from "@/lib/integrations/connections-store.server"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export type ConnectionSummary = {
  provider: string
  accountLabel: string | null
  connectedAt: string
}

/** Client-safe summary — never exposes access/refresh tokens. */
export const getConnection = createServerFn({ method: "GET" })
  .validator((data: { provider: string }) => data)
  .handler(async ({ data }): Promise<ConnectionSummary | null> => {
    const user = await requireServerAuthUser()
    const connection = await getValidConnection(user.id, data.provider)
    if (!connection) {
      return null
    }
    return {
      provider: connection.provider,
      accountLabel: connection.accountLabel,
      connectedAt: connection.connectedAt,
    }
  })

export const disconnectProvider = createServerFn({ method: "POST" })
  .validator((data: { provider: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireServerAuthUser()
    const supabase = createServiceRoleClient()
    await supabase
      .from("integration_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", data.provider)
  })
