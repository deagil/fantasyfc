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
  const isBottomBar = variant === "default"

  return (
    <Tabs value={tab} className={cn("w-full", className)}>
      <TabsList
        variant={variant}
        className={cn(
          "w-full",
          variant === "line" && "h-auto justify-start gap-6 bg-transparent p-0",
          isBottomBar &&
            "h-auto bg-background p-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] group-data-horizontal/tabs:h-auto dark:shadow-[0_-4px_16px_rgba(0,0,0,0.35)]"
        )}
      >
        {navPages.map(({ id, label, icon: Icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className={cn(
              variant === "line" &&
                "h-auto flex-none rounded-none px-0 py-2 text-xs font-semibold uppercase tracking-wide text-(--shell-muted) after:bottom-0 after:bg-pl-green data-active:text-(--shell-foreground)",
              isBottomBar &&
                "h-auto min-h-12 flex-1 flex-col gap-1 px-1 py-2 text-[10px] leading-none text-foreground after:hidden data-active:bg-muted data-active:text-foreground dark:data-active:bg-muted"
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
