-- FIFA-style player rating system storage.
--
-- player_season_history: per-season player aggregates (history_past shape),
--   seeded from the vaastav/Fantasy-Premier-League repo's players_raw.csv
--   (one file per season, full league cohort) by the seedRatingsHistory
--   server fn. These feed the "expected rating" baselines.
-- player_ratings: computed rating snapshots per (season, gameweek, player).
--   Written by the server with the service role; the client never reads these
--   tables directly (ratings are served through server functions).

create table public.player_season_history (
  player_code   integer not null,
  season_name   text not null,
  element_type  smallint not null check (element_type between 1 and 4),
  web_name      text not null,
  stats         jsonb not null,
  synced_at     timestamptz not null default now(),
  primary key (player_code, season_name)
);

create index player_season_history_season_idx
  on public.player_season_history (season_name);

create table public.player_ratings (
  season            text not null,
  event             integer not null check (event >= 0),
  player_id         integer not null,
  player_code       integer not null,
  web_name          text not null,
  element_type      smallint not null check (element_type between 1 and 4),
  overall           smallint not null check (overall between 0 and 100),
  current_overall   smallint not null check (current_overall between 0 and 100),
  expected_overall  smallint check (expected_overall between 0 and 100),
  performance_gap   smallint,
  trend             text not null,
  confidence        text not null check (confidence in ('low', 'medium', 'high')),
  unassessed        boolean not null,
  -- Full per-category detail (blended/current/expected scores, sub-category
  -- and stat breakdowns) for the player-detail view.
  categories        jsonb not null,
  computed_at       timestamptz not null default now(),
  primary key (season, event, player_id)
);

create index player_ratings_player_idx
  on public.player_ratings (player_code, season, event);

alter table public.player_season_history enable row level security;
alter table public.player_ratings enable row level security;

-- Served via server functions using the service role; no client policies.
grant select, insert, update, delete on public.player_season_history to service_role;
grant select, insert, update, delete on public.player_ratings to service_role;
