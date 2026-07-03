import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/squad")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: { tab: "team" } })
  },
})
