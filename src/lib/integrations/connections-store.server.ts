import "@tanstack/react-start/server-only"

import { decryptToken, encryptToken } from "@/lib/integrations/crypto"
import { getProvider } from "@/lib/integrations/registry"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import type {
  ExchangedTokens,
  IntegrationConnection,
} from "@/lib/integrations/types"

type ConnectionRow = {
  id: string
  user_id: string
  provider: string
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  scopes: string[] | null
  account_label: string | null
  connected_at: string
}

function decryptRow(row: ConnectionRow): IntegrationConnection {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    accessToken: decryptToken(row.access_token),
    refreshToken: row.refresh_token ? decryptToken(row.refresh_token) : null,
    expiresAt: row.expires_at,
    scopes: row.scopes,
    accountLabel: row.account_label,
    connectedAt: row.connected_at,
  }
}

/** Upserts an encrypted connection row for a user. Not exposed to the client directly. */
export async function saveConnection(
  userId: string,
  providerId: string,
  tokens: ExchangedTokens
) {
  const { ensureUserProfile } = await import("@/lib/auth/profile.server")
  await ensureUserProfile(userId)

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from("integration_connections")
    .upsert(
      {
        user_id: userId,
        provider: providerId,
        access_token: encryptToken(tokens.accessToken),
        refresh_token: tokens.refreshToken
          ? encryptToken(tokens.refreshToken)
          : null,
        expires_at: tokens.expiresAt,
        scopes: tokens.scopes,
        account_label: tokens.accountLabel ?? null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    )

  if (error) {
    throw new Error(`Could not save ${providerId} connection: ${error.message}`)
  }
}

async function fetchConnectionRow(userId: string, providerId: string) {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from("integration_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", providerId)
    .maybeSingle()

  return data as ConnectionRow | null
}

/**
 * Returns a connection with a valid (non-expired) access token, refreshing
 * and persisting it first if needed. Not exposed to the client directly.
 */
export async function getValidConnection(
  userId: string,
  providerId: string
): Promise<IntegrationConnection | null> {
  const row = await fetchConnectionRow(userId, providerId)
  if (!row) {
    return null
  }

  const connection = decryptRow(row)
  const isExpired =
    connection.expiresAt && new Date(connection.expiresAt).getTime() < Date.now()

  if (!isExpired || !connection.refreshToken) {
    return connection
  }

  const provider = getProvider(providerId)
  const refreshed = await provider.refresh(connection.refreshToken)
  await saveConnection(userId, providerId, {
    ...refreshed,
    refreshToken: refreshed.refreshToken ?? connection.refreshToken,
  })

  return getValidConnection(userId, providerId)
}
