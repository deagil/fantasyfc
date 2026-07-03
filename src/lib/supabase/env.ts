type SupabasePublicEnv = {
  url: string
  anonKey: string
}

function assertSupabasePublicEnv(
  env: { url: string | undefined; anonKey: string | undefined },
  runtime: "server" | "client"
): SupabasePublicEnv {
  const { url, anonKey } = env

  if (!url || !anonKey) {
    const hint =
      runtime === "client"
        ? "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY for Vercel builds) in your deployment environment."
        : "Set SUPABASE_URL and SUPABASE_ANON_KEY in your deployment environment."

    throw new Error(
      `@supabase/ssr: Supabase URL and anon key are required (${runtime}). ${hint}`
    )
  }

  return { url, anonKey }
}

/** Public Supabase credentials for the browser bundle. */
export function getBrowserSupabaseEnv(): SupabasePublicEnv {
  return assertSupabasePublicEnv(
    {
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    "client"
  )
}

/** Public Supabase credentials on the server (SSR + server functions). */
export function getServerSupabasePublicEnv(): SupabasePublicEnv {
  return assertSupabasePublicEnv(
    {
      url: process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL,
      anonKey: process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
    },
    "server"
  )
}
