-- SportsDB player IDs discovered from team pages (see enrichment/pages.ts).
-- The discover step fills this table; the batched seed step works through it
-- with official API lookups, marking rows processed as it goes.

create table public.sportsdb_candidates (
  sportsdb_id          integer primary key,
  sportsdb_team_id     integer not null,
  slug                 text,
  discovered_at        timestamptz not null default now(),
  processed_at         timestamptz,
  matched_player_code  integer
);

create index sportsdb_candidates_pending_idx
  on public.sportsdb_candidates (sportsdb_team_id)
  where processed_at is null;

alter table public.sportsdb_candidates enable row level security;

grant select, insert, update, delete on public.sportsdb_candidates to service_role;
