import { defineConfig, loadEnv } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const config = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || ""
  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ""

  return {
    resolve: { tsconfigPaths: true },
    define: {
      // Allow Vercel to set only SUPABASE_*; client bundle still gets VITE_*.
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
    },
    server: {
      // Portless proxies to 127.0.0.1; bind IPv4 explicitly (default ::1-only
      // breaks the proxy with 502). See portless.json for the mapped name/port.
      host: "127.0.0.1",
      // Allow requests proxied through Portless (https://<name>.localhost)
      // for local OAuth callback testing (Spotify requires an HTTPS redirect URI).
      allowedHosts: [".localhost"],
    },
    plugins: [
      devtools(),
      tailwindcss(),
      tanstackStart(),
      nitro({ preset: "vercel" }),
      viteReact(),
    ],
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  }
})

export default config
