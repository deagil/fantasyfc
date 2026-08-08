import { Link } from "@tanstack/react-router"
import { useMemo, type ReactNode } from "react"

import { MatchBonusList, MatchBpsTable } from "@/components/match-bps-table"
import { MatchEvents } from "@/components/match-events"
import { MatchHero } from "@/components/match-hero"
import { MatchPrematch } from "@/components/match-prematch"
import { MatchYourPlayers } from "@/components/match-your-players"
import { ScrollFade } from "@/components/scroll-fade"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useEnrichmentMaps } from "@/lib/enrichment/hooks"
import {
  getAwardedBonus,
  getBpsTable,
  getDefconRows,
  getMatchEvents,
} from "@/lib/fixtures/events"
import {
  getFixturePhase,
  getHeadToHead,
  getTeamRecentForm,
  getTeamRecord,
} from "@/lib/fixtures/form"
import {
  getFixturePointsByElement,
  getYourPlayersInFixture,
  isBonusAddedForEvent,
} from "@/lib/fixtures/live"
import { useFplBootstrap } from "@/lib/fpl/bootstrap-context"
import {
  useFplEntryPicksQuery,
  useFplEventLiveQuery,
  useFplEventStatusQuery,
  useFplSeasonFixturesQuery,
} from "@/lib/fpl/hooks"
import { useTeam } from "@/lib/fpl/team-context"
import type { FplFixture } from "@/lib/fpl/types"
import { cn } from "@/lib/utils"

function DefconSection({
  rows,
}: {
  rows: ReturnType<typeof getDefconRows>
}) {
  if (rows.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl bg-foreground/3 p-3">
      <p className="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        Defensive contributions
      </p>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li
            key={`${row.side}-${row.element}`}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="truncate font-medium">{row.webName}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Drawer chrome leading control — mirrors Close on the opposite side. */
export function MatchOpenPageButton({
  fixtureId,
  className,
}: {
  fixtureId: number
  className?: string
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn("shell-chrome-btn shrink-0", className)}
      nativeButton={false}
      render={
        <Link
          to="/fixture/$fixtureId"
          params={{ fixtureId: String(fixtureId) }}
          aria-label="Open full match page"
        />
      }
    >
      Open
    </Button>
  )
}

export function MatchDetailPane({
  fixture,
  showOpenLink = false,
  className,
}: {
  fixture: FplFixture | null
  /** Desktop / non-drawer surfaces that still need an inline open control. */
  showOpenLink?: boolean
  className?: string
}) {
  const { teamsById, elementsById } = useFplBootstrap()
  const { teamId } = useTeam()
  const { teamsByCode } = useEnrichmentMaps()

  const phase = fixture ? getFixturePhase(fixture) : null
  const isLive = phase === "live"

  const seasonFixturesQuery = useFplSeasonFixturesQuery({
    enabled: fixture != null,
  })
  const liveQuery = useFplEventLiveQuery(fixture?.event, {
    enabled: fixture != null && (phase === "live" || phase === "finished"),
    isLive,
  })
  const statusQuery = useFplEventStatusQuery({
    enabled: fixture != null && (phase === "live" || phase === "finished"),
    isLive,
  })
  const picksQuery = useFplEntryPicksQuery(teamId, fixture?.event, {
    enabled: fixture != null && teamId != null,
    isLive,
  })

  const homeTeam = fixture ? teamsById.get(fixture.team_h) : undefined
  const awayTeam = fixture ? teamsById.get(fixture.team_a) : undefined
  const homeBadgeUrl =
    homeTeam?.code != null
      ? (teamsByCode.get(homeTeam.code)?.badgeUrl ?? null)
      : null
  const awayBadgeUrl =
    awayTeam?.code != null
      ? (teamsByCode.get(awayTeam.code)?.badgeUrl ?? null)
      : null

  const seasonFixtures = seasonFixturesQuery.data ?? []

  const homeForm = useMemo(() => {
    if (!fixture) {
      return []
    }
    return getTeamRecentForm(fixture.team_h, seasonFixtures, teamsById)
  }, [fixture, seasonFixtures, teamsById])

  const awayForm = useMemo(() => {
    if (!fixture) {
      return []
    }
    return getTeamRecentForm(fixture.team_a, seasonFixtures, teamsById)
  }, [fixture, seasonFixtures, teamsById])

  const homeRecord = useMemo(() => {
    if (!fixture) {
      return null
    }
    return getTeamRecord(fixture.team_h, seasonFixtures)
  }, [fixture, seasonFixtures])

  const awayRecord = useMemo(() => {
    if (!fixture) {
      return null
    }
    return getTeamRecord(fixture.team_a, seasonFixtures)
  }, [fixture, seasonFixtures])

  const headToHead = useMemo(() => {
    if (!fixture) {
      return []
    }
    return getHeadToHead(fixture.team_h, fixture.team_a, seasonFixtures)
  }, [fixture, seasonFixtures])

  const matchEvents = useMemo(() => {
    if (!fixture) {
      return []
    }
    return getMatchEvents(fixture, elementsById)
  }, [elementsById, fixture])

  const bpsRows = useMemo(() => {
    if (!fixture) {
      return []
    }
    return getBpsTable(fixture, elementsById, phase === "live" ? 10 : undefined)
  }, [elementsById, fixture, phase])

  const awardedBonus = useMemo(() => {
    if (!fixture) {
      return []
    }
    return getAwardedBonus(fixture, elementsById)
  }, [elementsById, fixture])

  const defconRows = useMemo(() => {
    if (!fixture) {
      return []
    }
    return getDefconRows(fixture, elementsById)
  }, [elementsById, fixture])

  const yourPlayers = useMemo(() => {
    if (!fixture) {
      return []
    }
    const pointsByElement = getFixturePointsByElement(
      liveQuery.data,
      fixture.id
    )
    return getYourPlayersInFixture(
      picksQuery.data,
      pointsByElement,
      elementsById,
      fixture.team_h,
      fixture.team_a
    )
  }, [elementsById, fixture, liveQuery.data, picksQuery.data])

  const bonusAdded = isBonusAddedForEvent(
    statusQuery.data?.status,
    fixture?.event ?? 0
  )

  if (!fixture || !phase) {
    return (
      <div
        className={cn(
          "flex h-full min-h-40 items-center justify-center px-4 text-sm text-muted-foreground",
          className
        )}
      >
        Select a fixture to see the match centre.
      </div>
    )
  }

  let body: ReactNode

  switch (phase) {
    case "pre-match":
      body = (
        <>
          {seasonFixturesQuery.isPending && seasonFixtures.length === 0 ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : (
            <MatchPrematch
              fixture={fixture}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              homeForm={homeForm}
              awayForm={awayForm}
              headToHead={headToHead}
            />
          )}
          <MatchYourPlayers players={yourPlayers} />
        </>
      )
      break
    case "live":
      body = (
        <>
          <MatchYourPlayers players={yourPlayers} />
          <MatchEvents sections={matchEvents} />
          <MatchBpsTable
            rows={bpsRows}
            title="Live BPS"
            showProjectedBonus
          />
          <DefconSection rows={defconRows} />
        </>
      )
      break
    case "finished":
      body = (
        <>
          <MatchYourPlayers players={yourPlayers} />
          <MatchEvents sections={matchEvents} />
          <MatchBonusList players={awardedBonus} provisional={!bonusAdded} />
          <MatchBpsTable rows={bpsRows} title="BPS" />
          <DefconSection rows={defconRows} />
        </>
      )
      break
    default: {
      const exhaustiveCheck: never = phase
      body = exhaustiveCheck
    }
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {showOpenLink ? (
        <div className="flex justify-start px-4 pb-1">
          <MatchOpenPageButton fixtureId={fixture.id} />
        </div>
      ) : null}

      <MatchHero
        fixture={fixture}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeBadgeUrl={homeBadgeUrl}
        awayBadgeUrl={awayBadgeUrl}
        homeRecord={homeRecord}
        awayRecord={awayRecord}
      />

      <ScrollFade
        className="flex min-h-0 w-full min-w-0 flex-1"
        contentClassName="flex flex-col gap-3 px-4 pb-4"
      >
        {body}
      </ScrollFade>
    </div>
  )
}
