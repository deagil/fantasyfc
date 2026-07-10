import { createServerFn } from "@tanstack/react-start"

import { parseTeamId } from "@/lib/fpl/validate"
import type {
  BankLeagueTrophiesResult,
  ClaimPreview,
  ClaimResult,
  EntryClaim,
  LeagueTrophy,
} from "@/lib/trophies/types"

export const bankLeagueTrophies = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({
    teamId: parseTeamId((data as { teamId: unknown }).teamId),
  }))
  .handler(async ({ data }): Promise<BankLeagueTrophiesResult> => {
    const { bankLeagueTrophiesForTeam } = await import(
      "@/lib/trophies/bank.server"
    )
    return bankLeagueTrophiesForTeam(data.teamId)
  })

export const previewEntryClaim = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({
    teamId: parseTeamId((data as { teamId: unknown }).teamId),
  }))
  .handler(async ({ data }): Promise<ClaimPreview> => {
    const [{ requireServerAuthUser }, { previewEntryClaim: preview }] =
      await Promise.all([
        import("@/lib/auth/auth.server"),
        import("@/lib/trophies/claims.server"),
      ])
    await requireServerAuthUser()
    return preview(data.teamId)
  })

export const claimEntry = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({
    teamId: parseTeamId((data as { teamId: unknown }).teamId),
  }))
  .handler(async ({ data }): Promise<ClaimResult> => {
    const [{ requireServerAuthUser }, { claimEntryForUser }] =
      await Promise.all([
        import("@/lib/auth/auth.server"),
        import("@/lib/trophies/claims.server"),
      ])
    const user = await requireServerAuthUser()
    return claimEntryForUser(user.id, data.teamId)
  })

export const submitClaimHelp = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const payload = data as {
      season: unknown
      fplEntryId: unknown
      message: unknown
    }

    if (typeof payload.season !== "string" || payload.season.trim() === "") {
      throw new Error("Invalid season")
    }

    if (typeof payload.message !== "string") {
      throw new Error("Invalid message")
    }

    return {
      season: payload.season.trim(),
      fplEntryId: parseTeamId(payload.fplEntryId),
      message: payload.message,
    }
  })
  .handler(async ({ data }): Promise<{ id: string }> => {
    const [{ requireServerAuthUser }, { submitClaimHelpRequest }] =
      await Promise.all([
        import("@/lib/auth/auth.server"),
        import("@/lib/trophies/claims.server"),
      ])
    const user = await requireServerAuthUser()
    return submitClaimHelpRequest({
      requesterId: user.id,
      season: data.season,
      fplEntryId: data.fplEntryId,
      message: data.message,
    })
  })

export const getMyTrophies = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    claim: EntryClaim | null
    trophies: LeagueTrophy[]
  }> => {
    const [{ requireServerAuthUser }, { getTrophiesForUser }] =
      await Promise.all([
        import("@/lib/auth/auth.server"),
        import("@/lib/trophies/claims.server"),
      ])
    const user = await requireServerAuthUser()
    return getTrophiesForUser(user.id)
  }
)

export const getMyEntryClaim = createServerFn({ method: "GET" }).handler(
  async (): Promise<EntryClaim | null> => {
    const [{ requireServerAuthUser }, { getEntryClaimForUser }] =
      await Promise.all([
        import("@/lib/auth/auth.server"),
        import("@/lib/trophies/claims.server"),
      ])
    const user = await requireServerAuthUser()
    return getEntryClaimForUser(user.id)
  }
)
