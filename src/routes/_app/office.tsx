import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/office")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: { tab: "scouts" } })
  },
})
