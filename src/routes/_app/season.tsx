import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/season")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: { tab: "fixtures" } })
  },
})
