import { createFileRoute, Link, notFound } from "@tanstack/react-router"

import { AppShell } from "@/components/app-shell"
import { DetailPageDesktopChrome } from "@/components/detail-page-chrome"
import { MobilePageHeader } from "@/components/mobile-page-header"
import { TrophyMark } from "@/components/trophy-mark"
import { useFplStandingsQuery } from "@/lib/fpl/hooks"
import { TeamProvider, useTeam } from "@/lib/fpl/team-context"
import {
  contentContainerClassName,
  hubMainClassName,
  hubTileContainerClassName,
  mobileContentTopSpacerClassName,
} from "@/lib/layout"
import { tabSearch } from "@/lib/nav-pages"
import {
  awardDescription,
  awardHeadline,
  findSilverwareTitle,
  medalOrdinal,
  podiumStatsFromStandings,
} from "@/lib/trophies/silverware"
import { cn } from "@/lib/utils"

const SEASON_LABEL = "25/26"

export const Route = createFileRoute("/trophy/$leagueId")({
  beforeLoad: ({ params }) => {
    const leagueId = Number(params.leagueId)

    if (!Number.isFinite(leagueId) || leagueId <= 0) {
      throw notFound()
    }
  },
  component: TrophyDetailRoute,
})

function TrophyDetailRoute() {
  return (
    <TeamProvider>
      <TrophyDetailPage />
    </TeamProvider>
  )
}

function TrophyDetailPage() {
  const { leagueId: leagueIdParam } = Route.useParams()
  const leagueId = Number(leagueIdParam)
  const { entry, teamId, isLoggedIn, isLoading } = useTeam()

  const title =
    entry !== null ? findSilverwareTitle(entry.leagues.classic, leagueId) : undefined

  const standingsQuery = useFplStandingsQuery(leagueId, {
    enabled: title !== undefined,
  })
  const standings = standingsQuery.data?.standings.results ?? []
  const podiumStats =
    title !== undefined
      ? podiumStatsFromStandings(standings, title.rank)
      : undefined

  const awardEntryId = podiumStats?.entryId ?? entry?.id ?? null
  const viewerOwnsAward =
    teamId !== null && awardEntryId !== null && teamId === awardEntryId

  const awardEntryName = podiumStats?.entryName ?? entry?.name
  const pageTitle = title?.leagueName ?? "Award"

  const backLink = (
    <Link to="/" search={tabSearch("hub")} aria-label="Back" />
  )

  return (
    <AppShell className="flex flex-col overflow-x-hidden lg:h-svh lg:overflow-y-hidden">
      <MobilePageHeader
        className="lg:hidden"
        title={pageTitle}
        titleStyle={{ viewTransitionName: "vt-trophy-title" }}
        backRender={backLink}
      />

      <main className={hubMainClassName}>
        <div
          className={cn(
            contentContainerClassName,
            hubTileContainerClassName,
            "flex flex-1 flex-col"
          )}
        >
          <DetailPageDesktopChrome
            title={pageTitle}
            titleStyle={{ viewTransitionName: "vt-trophy-title" }}
            backRender={backLink}
          />

          <div className={mobileContentTopSpacerClassName} aria-hidden />

          {!isLoggedIn ? (
            <p className="py-16 text-center text-sm text-(--shell-muted)">
              Connect your team to view this award.
            </p>
          ) : isLoading && !entry ? (
            <p className="py-16 text-center text-sm text-(--shell-muted)">
              Loading award…
            </p>
          ) : !title ? (
            <p className="py-16 text-center text-sm text-(--shell-muted)">
              This award isn&apos;t available for your team.
            </p>
          ) : (
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-2 pb-10 pt-6 lg:mt-2 lg:justify-center lg:pb-16 lg:pt-2">
              <TrophyMark
                leagueId={title.leagueId}
                medal={title.medal}
                className="max-w-56 w-56 lg:max-w-64 lg:w-64"
              />

              <h2 className="mt-8 text-center font-heading text-2xl font-semibold tracking-tight text-(--shell-foreground)">
                {awardHeadline(title)}
              </h2>
              <p className="mt-1 text-center text-sm font-medium text-(--shell-foreground)/80">
                {title.leagueName}
              </p>
              <p className="mt-4 max-w-sm text-center text-sm leading-relaxed text-(--shell-muted)">
                {awardDescription(title, {
                  season: SEASON_LABEL,
                  entryName: awardEntryName,
                  viewerOwnsAward,
                  points: podiumStats?.points,
                  margin: podiumStats?.margin,
                })}
              </p>

              <dl className="mt-8 grid w-full max-w-xs grid-cols-2 gap-3 text-center">
                <div className="rounded-2xl bg-white/70 px-3 py-3 lg:rounded-[2px]">
                  <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                    Finish
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-(--shell-foreground)">
                    {medalOrdinal(title.medal)}
                  </dd>
                </div>
                <div className="rounded-2xl bg-white/70 px-3 py-3 lg:rounded-[2px]">
                  <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                    Season
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-(--shell-foreground)">
                    {SEASON_LABEL}
                  </dd>
                </div>
                <div className="rounded-2xl bg-white/70 px-3 py-3 lg:rounded-[2px]">
                  <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                    Points
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-(--shell-foreground)">
                    {podiumStats !== undefined ? podiumStats.points : "—"}
                  </dd>
                </div>
                <div className="rounded-2xl bg-white/70 px-3 py-3 lg:rounded-[2px]">
                  <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                    Gap
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-(--shell-foreground)">
                    {podiumStats !== undefined ? `+${podiumStats.margin}` : "—"}
                  </dd>
                </div>
                <div className="col-span-2 rounded-2xl bg-white/70 px-3 py-3 lg:rounded-[2px]">
                  <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                    League size
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-(--shell-foreground)">
                    {title.leagueSize > 0
                      ? `${title.leagueSize} managers`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  )
}
