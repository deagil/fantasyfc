-- Shared end-of-season league podiums + seasonal entry claims.
-- Podium rows are league facts (no user_id). Claims bind a Deadline user
-- to an FPL entry_id for a season; the cabinet is a join.

create table public.league_trophies (
  id            uuid primary key default gen_random_uuid(),
  league_id     integer not null,
  season        text not null,
  rank          smallint not null check (rank in (1, 2, 3)),
  medal         text not null check (medal in ('gold', 'silver', 'bronze')),
  league_name   text not null,
  league_size   integer not null check (league_size >= 0),
  entry_id      integer not null,
  entry_name    text not null,
  player_name   text not null,
  points        integer not null,
  margin        integer not null,
  banked_at     timestamptz not null default now(),
  unique (league_id, season, rank)
);

create index league_trophies_entry_season_idx
  on public.league_trophies (entry_id, season);

alter table public.league_trophies enable row level security;

grant select on public.league_trophies to authenticated;
grant select, insert, update, delete on public.league_trophies to service_role;

create policy "league_trophies readable by authenticated users"
  on public.league_trophies for select
  to authenticated
  using (true);

create table public.entry_claims (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  season          text not null,
  fpl_entry_id    integer not null,
  entry_name      text not null,
  player_name     text not null,
  claimed_at      timestamptz not null default now(),
  unique (season, fpl_entry_id),
  unique (user_id, season)
);

alter table public.entry_claims enable row level security;

grant select on public.entry_claims to authenticated;
grant select, insert, update, delete on public.entry_claims to service_role;

create policy "entry_claims readable by authenticated users"
  on public.entry_claims for select
  to authenticated
  using (true);

create table public.claim_help_requests (
  id                     uuid primary key default gen_random_uuid(),
  requester_id           uuid not null references public.profiles(id) on delete cascade,
  season                 text not null,
  fpl_entry_id           integer not null,
  existing_claim_user_id uuid references public.profiles(id) on delete set null,
  message                text not null,
  status                 text not null default 'open'
                           check (status in ('open', 'resolved')),
  created_at             timestamptz not null default now()
);

alter table public.claim_help_requests enable row level security;

grant select, insert on public.claim_help_requests to authenticated;
grant select, insert, update, delete on public.claim_help_requests to service_role;

create policy "claim_help_requests readable by requester"
  on public.claim_help_requests for select
  to authenticated
  using (auth.uid() = requester_id);

create policy "claim_help_requests insertable by requester"
  on public.claim_help_requests for insert
  to authenticated
  with check (auth.uid() = requester_id);
