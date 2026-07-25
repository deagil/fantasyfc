import { createFileRoute, redirect } from "@tanstack/react-router"

import { tabSearch } from "@/lib/nav-pages"

export const Route = createFileRoute("/fixtures")({
  beforeLoad: () => {
    throw redirect({
      to: "/",
      search: tabSearch("fixtures"),
    })
  },
})
