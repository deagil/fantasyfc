import type { ComponentType } from "react"
import {
  ArrowLeftRightIcon,
  CalendarIcon,
  HomeIcon,
  LayoutGridIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { TileGridPage } from "@/components/tile-grid-page"

export const defaultNavTabId = "central" as const

export type NavTabId =
  | "central"
  | "squad"
  | "transfers"
  | "office"
  | "season"

export type NavPageConfig = {
  id: NavTabId
  label: string
  icon: LucideIcon
  View: ComponentType
}

export const navPages: NavPageConfig[] = [
  { id: "central", label: "Central", icon: HomeIcon, View: TileGridPage },
  { id: "squad", label: "Squad", icon: UsersIcon, View: TileGridPage },
  {
    id: "transfers",
    label: "Transfers",
    icon: ArrowLeftRightIcon,
    View: TileGridPage,
  },
  { id: "office", label: "Office", icon: LayoutGridIcon, View: TileGridPage },
  { id: "season", label: "Season", icon: CalendarIcon, View: TileGridPage },
]

export function isNavTabId(value: string): value is NavTabId {
  return navPages.some((page) => page.id === value)
}

export function getNavPageIndex(tab: NavTabId): number {
  const index = navPages.findIndex((page) => page.id === tab)
  return index === -1 ? 0 : index
}

export function tabSearch(tab: NavTabId): { tab: NavTabId } {
  return { tab }
}

export function validateHubSearch(
  search: Record<string, unknown>
): { tab: NavTabId } {
  const tab = search.tab
  if (typeof tab === "string" && isNavTabId(tab)) {
    return { tab }
  }
  return { tab: defaultNavTabId }
}
