import { CircleHelpIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_SHORT_LABELS,
  CATEGORY_TITLES,
  getStatDescription,
  getStatLabel,
  getSubcategoryLabel,
} from "@/lib/ratings/copy"
import { usePlayerRatingDetail } from "@/lib/ratings/hooks"
import type { CategoryId, CategoryScore } from "@/lib/ratings/model"
import {
  ratingSurfaceClassName,
  ratingTextClassName,
} from "@/lib/ratings/tone"
import { cn } from "@/lib/utils"

const CATEGORY_ORDER: CategoryId[] = [
  "ATK",
  "GKP",
  "PLY",
  "IMP",
  "DEF",
  "REL",
  "FPL",
]

type RatingCategoryBreakdownProps = {
  playerId: number
  categories: Partial<Record<CategoryId, number>> | undefined
  isLoading: boolean
}

function CategoryTile({
  label,
  score,
  isExpanded,
  onToggle,
}: {
  label: string
  score: number
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={isExpanded}
      onClick={onToggle}
      className={cn(
        "flex flex-col gap-1 rounded-lg px-2.5 py-2 text-left transition-shadow",
        ratingSurfaceClassName(score),
        isExpanded && "ring-2 ring-foreground/20"
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn("text-lg font-semibold tabular-nums", ratingTextClassName(score))}
      >
        {score}
      </span>
    </button>
  )
}

function StatInfoButton({ description }: { description: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label="What is this stat?"
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
        onClick={(event) => event.stopPropagation()}
      >
        <CircleHelpIcon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-56 text-pretty">
        {description}
      </TooltipContent>
    </Tooltip>
  )
}

function CategoryBreakdownPanel({
  categoryId,
  category,
}: {
  categoryId: CategoryId
  category: CategoryScore
}) {
  const subEntries = Object.entries(category.sub).sort(([a], [b]) =>
    a.localeCompare(b)
  )

  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {CATEGORY_TITLES[categoryId]}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {CATEGORY_DESCRIPTIONS[categoryId]}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 text-2xl font-semibold tabular-nums leading-none",
            ratingTextClassName(category.score)
          )}
        >
          {category.score}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {subEntries.map(([subKey, sub]) => (
          <div key={subKey}>
            <div className="flex items-baseline justify-between gap-2 px-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {getSubcategoryLabel(subKey)}
              </p>
              {sub.score != null ? (
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    ratingTextClassName(sub.score)
                  )}
                >
                  {sub.score}
                </span>
              ) : null}
            </div>

            <ul className="mt-2 space-y-1.5">
              {Object.entries(sub.stats).map(([statKey, stat]) => (
                <li
                  key={statKey}
                  className="flex items-center justify-between gap-2 rounded-lg bg-background/70 px-2.5 py-1.5"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm text-foreground">
                      {getStatLabel(statKey)}
                    </span>
                    <StatInfoButton description={getStatDescription(statKey)} />
                  </div>
                  {stat.rating != null ? (
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        ratingTextClassName(stat.rating)
                      )}
                    >
                      {stat.rating}
                    </span>
                  ) : (
                    <span className="shrink-0 text-sm text-muted-foreground">—</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RatingCategoryBreakdown({
  playerId,
  categories,
  isLoading,
}: RatingCategoryBreakdownProps) {
  const [expandedId, setExpandedId] = useState<CategoryId | null>(null)
  const { data: detail, isLoading: detailLoading, error: detailError } =
    usePlayerRatingDetail(playerId)

  useEffect(() => {
    setExpandedId(null)
  }, [playerId])

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!categories) {
    return null
  }

  const scores = CATEGORY_ORDER.filter((id) => categories[id] != null)
  const expandedCategory =
    expandedId != null ? detail?.categories?.[expandedId] : undefined

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {scores.map((id) => {
          const score = categories[id]
          if (score == null) {
            return null
          }
          return (
            <CategoryTile
              key={id}
              label={CATEGORY_SHORT_LABELS[id]}
              score={score}
              isExpanded={expandedId === id}
              onToggle={() =>
                setExpandedId((current) => (current === id ? null : id))
              }
            />
          )
        })}
      </div>

      {expandedId != null ? (
        detailLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : detailError ? (
          <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
            Could not load stat breakdown.
          </p>
        ) : expandedCategory ? (
          <CategoryBreakdownPanel
            categoryId={expandedId}
            category={expandedCategory}
          />
        ) : null
      ) : null}
    </div>
  )
}
