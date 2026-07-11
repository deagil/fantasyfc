import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { tabSearch } from "@/lib/nav-pages"

export const Route = createFileRoute("/scouts")({
  beforeLoad: ({ location }) => {
    // Only the index path redirects — child routes like /scouts/any-position must load.
    if (location.pathname === "/scouts" || location.pathname === "/scouts/") {
      throw redirect({ to: "/", search: tabSearch("transfers") })
    }
  },
  component: ScoutsLayout,
})

function ScoutsLayout() {
  return <Outlet />
}
