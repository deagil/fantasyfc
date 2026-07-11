-- TheSportsDB enrichment layer (see docs/plans/thesportsdb-enrichment.md).
--
-- player_enrichment / team_enrichment map stable FPL codes to SportsDB
-- entities and cache the fields the app uses (artwork URLs, bio, colours).
-- Seeded by the seedEnrichment server fn; served through server functions
-- with the service role — the client never reads these tables directly.
--
-- Attribution requirement: player & club artwork and enrichment data are
-- sourced from TheSportsDB.com and must be credited in the app UI.

create table public.player_enrichment (
  player_code       integer primary key,           -- FPL element code (stable across seasons)
  sportsdb_id       integer not null,
  web_name          text not null,                 -- FPL web_name at sync time, for debugging
  cutout_url        text,                          -- transparent PNG headshot
  render_url        text,                          -- transparent PNG full body
  thumb_url         text,
  position          text,                          -- e.g. "Central Midfield"
  creative_commons  boolean not null default false,
  -- nationality, birth location, height/weight, description, socials, shirt
  -- number, footedness, fanart URLs…
  bio               jsonb not null default '{}'::jsonb,
  match_method      text not null check (match_method in ('dob+name', 'name', 'manual')),
  synced_at         timestamptz not null default now()
);

create index player_enrichment_sportsdb_idx
  on public.player_enrichment (sportsdb_id);

create table public.team_enrichment (
  team_code         integer primary key,           -- FPL team code (stable across seasons)
  sportsdb_id       integer not null,
  name              text not null,
  badge_url         text,                          -- trademarked: display "as is" only
  logo_url          text,
  equipment_url     text,                          -- current kit render
  banner_url        text,
  colours           text[] not null default '{}',  -- brand hex colours
  stadium           jsonb not null default '{}'::jsonb,
  synced_at         timestamptz not null default now()
);

alter table public.player_enrichment enable row level security;
alter table public.team_enrichment enable row level security;

grant select, insert, update, delete on public.player_enrichment to service_role;
grant select, insert, update, delete on public.team_enrichment to service_role;
