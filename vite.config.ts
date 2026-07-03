import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
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
})

export default config
