import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/transfers")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: { tab: "transfer-hub" } })
  },
})
