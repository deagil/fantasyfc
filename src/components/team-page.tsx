import { useCallback, useEffect, useMemo, useState } from "react"

import { DataTile } from "@/components/data-tile"
import { PlayerDetailPane } from "@/components/player-detail-pane"
import { SquadPitch, SquadPitchSkeleton } from "@/components/squad-pitch"
import {
  Drawer,
  DrawerContent,
  DrawerPanel,
  drawerChromeOffsetClassName,
} from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useFplBootstrap } from "@/lib/fpl/bootstrap-context"
import {
  useFplEntryPicksQuery,
  useFplEntryQuery,
  useFplEventLiveQuery,
} from "@/lib/fpl/hooks"
import {
  buildLiveStatsByElement,
  buildSquadSlots,
  getChipLabel,
  getFormation,
  groupSlotsByPitchLine,
  splitPicks,
} from "@/lib/fpl/squad"
import { useTeam } from "@/lib/fpl/team-context"
import type { FplElement } from "@/lib/fpl/types"
import { hubMasterDetailGridClassName } from "@/lib/layout"
import { usePlayerRatingsById } from "@/lib/ratings/hooks"
import { cn } from "@/lib/utils"

function resolveCurrentEventId(
  events: Array<{ id: number; is_current: boolean; is_next: boolean }>
): number | null {
  const current = events.find((event) => event.is_current)
  if (current) {
    return current.id
  }
  const next = events.find((event) => event.is_next)
  if (next) {
    return next.id
  }
  if (events.length === 0) {
    return null
  }
  return events[0].id
}

export type TeamPageProps = {
  entryId: number | null
  title?: string
  emptyLabel?: string
  variant?: "page" | "sheet"
  className?: string
}

export function MyTeamPage() {
  const { teamId, isLoggedIn } = useTeam()
  return (
    <TeamPage
      entryId={isLoggedIn ? teamId : null}
      emptyLabel="Connect a team"
    />
  )
}

export function TeamPage({
  entryId,
  title,
  emptyLabel = "Connect a team",
  variant = "page",
  className,
}: TeamPageProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const {
    bootstrap,
    teamsById,
    elementsById,
    isLoading: bootstrapLoading,
    error,
  } = useFplBootstrap()
  const { ratingsById } = usePlayerRatingsById()
  const entryQuery = useFplEntryQuery(entryId)

  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  const [mobilePlayer, setMobilePlayer] = useState<FplElement | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const events = bootstrap?.events ?? []
  const selectedEventId = useMemo(() => resolveCurrentEventId(events), [events])
  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  )
  const isLive = Boolean(selectedEvent?.is_current && !selectedEvent.finished)
  const useSplitPane = isDesktop && variant === "page"

  const picksQuery = useFplEntryPicksQuery(entryId, selectedEventId, {
    enabled: entryId != null && selectedEventId != null,
    isLive,
  })
  const liveQuery = useFplEventLiveQuery(selectedEventId, {
    enabled: entryId != null && selectedEventId != null,
    isLive,
  })

  const picks = picksQuery.data?.picks ?? []
  const liveByElement = useMemo(
    () => buildLiveStatsByElement(liveQuery.data?.elements),
    [liveQuery.data?.elements]
  )

  const { starting, bench } = useMemo(() => splitPicks(picks), [picks])
  const startingSlots = useMemo(
    () => buildSquadSlots(starting, elementsById, ratingsById, liveByElement),
    [elementsById, liveByElement, ratingsById, starting]
  )
  const benchSlots = useMemo(
    () => buildSquadSlots(bench, elementsById, ratingsById, liveByElement),
    [bench, elementsById, liveByElement, ratingsById]
  )
  const lines = useMemo(
    () => groupSlotsByPitchLine(startingSlots),
    [startingSlots]
  )
  const allSlots = useMemo(
    () => [...startingSlots, ...benchSlots],
    [benchSlots, startingSlots]
  )

  const formation = starting.length === 11 ? getFormation(starting) : null
  const chipId = picksQuery.data?.active_chip ?? null
  const chipLabel = getChipLabel(chipId)
  const gwPoints = picksQuery.data?.entry_history?.points ?? null
  const teamName = title ?? entryQuery.data?.name ?? "Team"

  const selectedPlayer = useMemo(() => {
    if (selectedPlayerId == null) {
      return null
    }
    return (
      allSlots.find((slot) => slot.player.id === selectedPlayerId)?.player ??
      null
    )
  }, [allSlots, selectedPlayerId])

  useEffect(() => {
    setSelectedPlayerId(null)
    setMobilePlayer(null)
    setDrawerOpen(false)
  }, [entryId])

  useEffect(() => {
    if (!useSplitPane || startingSlots.length === 0) {
      return
    }

    if (
      selectedPlayerId != null &&
      startingSlots.some((slot) => slot.player.id === selectedPlayerId)
    ) {
      return
    }

    const captain =
      startingSlots.find((slot) => slot.pick.is_captain) ?? startingSlots[0]
    setSelectedPlayerId(captain.player.id)
  }, [useSplitPane, selectedPlayerId, startingSlots])

  const handleSelectPlayer = useCallback(
    (playerId: number) => {
      const player =
        allSlots.find((slot) => slot.player.id === playerId)?.player ?? null
      if (player == null) {
        return
      }

      if (useSplitPane) {
        setSelectedPlayerId(playerId)
        return
      }

      setMobilePlayer(player)
      setDrawerOpen(true)
    },
    [allSlots, useSplitPane]
  )

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setDrawerOpen(open)
    if (!open) {
      setMobilePlayer(null)
    }
  }, [])

  const isLoading =
    bootstrapLoading ||
    (entryId != null && picksQuery.isPending && picks.length === 0)
  const picksError = picksQuery.isError ? "Could not load this squad." : error

  const subtitleParts = [
    formation,
    gwPoints != null ? `${gwPoints} pts` : null,
    chipLabel,
  ].filter((part): part is string => part != null)

  function renderPitch() {
    if (entryId == null) {
      return (
        <div className="flex min-h-[22rem] flex-1 items-center justify-center px-4">
          <DataTile.EmptyState>{emptyLabel}</DataTile.EmptyState>
        </div>
      )
    }
    if (isLoading) {
      return <SquadPitchSkeleton />
    }
    if (picksError) {
      return (
        <p className="px-4 py-6 text-sm text-muted-foreground">{picksError}</p>
      )
    }
    if (startingSlots.length === 0) {
      return (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No squad for this gameweek.
        </p>
      )
    }

    return (
      <SquadPitch
        lines={lines}
        bench={benchSlots}
        chipLabel={chipLabel}
        chipId={chipId}
        selectedPlayerId={
          useSplitPane
            ? selectedPlayerId
            : mobilePlayer && drawerOpen
              ? mobilePlayer.id
              : null
        }
        onSelect={handleSelectPlayer}
        className="px-2 pb-2"
      />
    )
  }

  const playerDrawer = !useSplitPane ? (
    <Drawer
      nested={variant === "sheet"}
      open={drawerOpen}
      onOpenChange={handleDrawerOpenChange}
    >
      <DrawerContent size="md" align="full">
        <DrawerPanel
          title={mobilePlayer?.web_name ?? "Player"}
          bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <PlayerDetailPane
            player={mobilePlayer}
            teamsById={teamsById}
            className={cn(drawerChromeOffsetClassName, "overflow-y-auto")}
          />
        </DrawerPanel>
      </DrawerContent>
    </Drawer>
  ) : null

  if (variant === "sheet") {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
        {subtitleParts.length > 0 ? (
          <p className="px-4 pb-2 text-center text-sm font-medium text-muted-foreground">
            {subtitleParts.join(" · ")}
          </p>
        ) : null}
        {renderPitch()}
        {playerDrawer}
      </div>
    )
  }

  return (
    <>
      <div className={cn(hubMasterDetailGridClassName, className)}>
        <DataTile
          interactive
          className="max-lg:h-auto lg:col-span-2 lg:col-start-1 lg:row-span-3 lg:row-start-1"
        >
          <DataTile.Header className="flex-col items-stretch gap-1 px-3 pt-3 pb-2 lg:px-4">
            <DataTile.Heading>
              <DataTile.Label style={{ viewTransitionName: "vt-team-title" }}>
                {teamName}
              </DataTile.Label>
              <DataTile.Subtitle className="text-sm font-medium">
                {subtitleParts.length > 0
                  ? subtitleParts.join(" · ")
                  : selectedEventId != null
                    ? `Gameweek ${selectedEventId}`
                    : "Squad"}
              </DataTile.Subtitle>
            </DataTile.Heading>
          </DataTile.Header>
          <DataTile.Content
            align="between"
            className="min-h-0 flex-1 gap-2 overflow-hidden px-0 pt-0 max-lg:flex-none"
          >
            {renderPitch()}
          </DataTile.Content>
        </DataTile>

        <DataTile
          interactive
          className="col-span-2 row-span-3 hidden lg:col-start-3 lg:row-start-1 lg:flex"
        >
          <DataTile.Header className="pt-3 pb-2">
            <DataTile.Heading>
              <DataTile.Label>Player</DataTile.Label>
            </DataTile.Heading>
          </DataTile.Header>
          <DataTile.Content
            align="between"
            className="min-h-0 flex-1 overflow-hidden px-0 pt-0"
          >
            <PlayerDetailPane
              player={selectedPlayer}
              teamsById={teamsById}
              emptyTitle="Tap a player on the pitch"
              emptyDescription="Choose a starter or substitute to open their scout report."
              className="overflow-y-auto"
            />
          </DataTile.Content>
        </DataTile>
      </div>

      {playerDrawer}
    </>
  )
}
