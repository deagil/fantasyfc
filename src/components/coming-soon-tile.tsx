import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { COMING_SOON_LABEL } from "@/lib/nav-pages"
import { cn } from "@/lib/utils"

type ComingSoonTileProps = {
  className?: string
  children: React.ReactNode
}

export function ComingSoonTile({ className, children }: ComingSoonTileProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              "relative h-full min-h-0 cursor-not-allowed",
              className
            )}
          >
            {children}
          </div>
        }
      />
      <TooltipContent>{COMING_SOON_LABEL}</TooltipContent>
    </Tooltip>
  )
}
