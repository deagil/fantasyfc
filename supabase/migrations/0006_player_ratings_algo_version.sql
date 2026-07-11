-- Rating snapshots are pure functions of (FPL data, algorithm). When the
-- algorithm changes (RATINGS_ALGO_VERSION in src/lib/ratings/server.ts),
-- stored snapshots for the current gameweek would otherwise keep serving
-- stale numbers. Versioning the rows lets the server recompute and overwrite.

alter table public.player_ratings
  add column algo_version smallint not null default 1;

create index player_ratings_algo_idx
  on public.player_ratings (season, event, algo_version);
