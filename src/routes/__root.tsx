import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import { AuthProvider } from "@/lib/auth/auth-context"
import {
  KickoffThemeProvider,
  kickoffThemeBootScript,
} from "@/lib/kickoff-theme-context"
import { SpotifyPlayerProvider } from "@/lib/integrations/spotify/player-context"
import { QueryProvider } from "@/lib/query-provider"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      {
        title: "Deadline",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{ __html: kickoffThemeBootScript }}
        />
      </head>
      <body>
        <QueryProvider>
          <AuthProvider>
            <KickoffThemeProvider>
              <SpotifyPlayerProvider>{children}</SpotifyPlayerProvider>
            </KickoffThemeProvider>
          </AuthProvider>
        </QueryProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
