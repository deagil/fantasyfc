import { Link, useSearch } from "@tanstack/react-router"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { navPages, tabSearch } from "@/lib/nav-pages"
import { cn } from "@/lib/utils"

type NavTabsProps = {
  className?: string
  variant?: "default" | "line"
}

export function NavTabs({ className, variant = "line" }: NavTabsProps) {
  const { tab } = useSearch({ from: "/_app" })

  return (
    <Tabs value={tab} className={cn("w-full", className)}>
      <TabsList
        variant={variant}
        className={cn(
          "w-full",
          variant === "line" && "h-auto justify-start gap-6 bg-transparent p-0"
        )}
      >
        {navPages.map(({ id, label, icon: Icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className={cn(
              variant === "line" &&
                "h-auto flex-none rounded-none px-0 py-2 text-xs font-semibold uppercase tracking-wide after:bottom-0"
            )}
            render={<Link to="/" search={tabSearch(id)} />}
          >
            <Icon />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
