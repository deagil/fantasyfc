import type { ComponentType } from "react"
import {
  ArrowLeftRightIcon,
  BinocularsIcon,
  CalendarDaysIcon,
  HomeIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { TileGridPage } from "@/components/tile-grid-page"
import { CentralPage } from "@/components/central-page"

export const COMING_SOON_LABEL = "Coming soon"

export const defaultNavTabId = "hub" as const

export type NavTabId =
  | "hub"
  | "team"
  | "transfer-hub"
  | "scouts"
  | "fixtures"

export type NavPageConfig = {
  id: NavTabId
  label: string
  icon: LucideIcon
  View: ComponentType
  enabled: boolean
}

export const navPages: NavPageConfig[] = [
  { id: "hub", label: "Hub", icon: HomeIcon, View: CentralPage, enabled: true },
  { id: "team", label: "Team", icon: UsersIcon, View: TileGridPage, enabled: false },
  {
    id: "transfer-hub",
    label: "Transfer Hub",
    icon: ArrowLeftRightIcon,
    View: TileGridPage,
    enabled: false,
  },
  {
    id: "scouts",
    label: "Scouts",
    icon: BinocularsIcon,
    View: TileGridPage,
    enabled: false,
  },
  {
    id: "fixtures",
    label: "Fixtures",
    icon: CalendarDaysIcon,
    View: TileGridPage,
    enabled: false,
  },
]

const legacyNavTabIds: Record<string, NavTabId> = {
  central: "hub",
  squad: "team",
  transfers: "transfer-hub",
  office: "scouts",
  season: "fixtures",
}

export function isNavTabId(value: string): value is NavTabId {
  return navPages.some((page) => page.id === value)
}

export function resolveNavTabId(value: string): NavTabId | null {
  if (isNavTabId(value)) {
    return value
  }

  return legacyNavTabIds[value] ?? null
}

export function isNavPageEnabled(tab: NavTabId): boolean {
  return navPages.find((page) => page.id === tab)?.enabled ?? false
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
  if (typeof tab === "string") {
    const resolved = resolveNavTabId(tab)
    if (resolved && isNavPageEnabled(resolved)) {
      return { tab: resolved }
    }
  }
  return { tab: defaultNavTabId }
}
