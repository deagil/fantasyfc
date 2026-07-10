# Supabase backend + accounts — implementation plan

Goal: give the app a real multi-user backend. Today there is no login and no
shared persistence — every page is stateless, reads happen straight from the
FPL public API. This introduces Supabase as the general backend (auth + DB)
so users can have accounts, save "special" data, and see each other's data
where permitted. The [Spotify Connect plan](./spotify-connect.md) becomes one
consumer of this backend (its token storage moves here) rather than its own
standalone DB.

This is the **first real accounts feature** in the app — there's currently no
session/login concept to migrate, only ad-hoc FPL team ID lookups (public,
no auth) in `src/lib/fpl/`.

## Why Supabase specifically

- Postgres + Auth + Row Level Security in one hosted service — avoids
  standing up separate auth and DB infra for a personal/small-group app.
- RLS is the natural fit for "users can see other users' special data":
  policies live next to the data, not scattered through server functions.
- Has a JS client usable from TanStack Start server functions.

## New env vars

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (client-safe, used with RLS)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, bypasses RLS — needed for things
  like token refresh writes; never sent to the client)

## Data model (initial)

```
auth.users                     -- managed by Supabase Auth
profiles
  id            uuid PK, references auth.users.id
  display_name  text
  avatar_url    text
  created_at    timestamptz

integration_connections         -- generalized token storage (see spotify-connect.md)
  id             uuid PK
  user_id        uuid FK -> profiles.id
  provider       text            -- 'spotify', future providers
  access_token   text            -- encrypted
  refresh_token  text            -- encrypted
  expires_at     timestamptz
  scopes         text[]
  account_label  text
  connected_at   timestamptz

-- "special data": FPL meta-game layer (trophy cabinet). Card/pack unpacking
-- is deferred — see "Deferred" section below.
-- Bank vs claim: podium rows are league facts; users soft-claim a seasonal
-- FPL entry_id. Cabinet = join on (season, entry_id).

league_trophies
  id             uuid PK
  league_id      integer         -- FPL classic league id (may vanish later)
  season         text            -- e.g. '2025/26'
  rank           smallint        -- 1, 2, or 3
  medal          text            -- 'gold' | 'silver' | 'bronze'
  -- fully denormalized snapshot: the league itself can disappear or change
  -- from FPL's side over time, so nothing about the display should depend
  -- on re-fetching it later.
  league_name    text
  league_size    integer
  entry_id       integer         -- FPL entry that finished at this rank
  entry_name     text
  player_name    text
  points         integer
  margin         integer         -- points ahead of the next rank down
  banked_at      timestamptz
  unique (league_id, season, rank)

entry_claims
  id             uuid PK
  user_id        uuid FK -> profiles.id
  season         text
  fpl_entry_id   integer
  entry_name     text
  player_name    text
  claimed_at     timestamptz
  unique (season, fpl_entry_id)
  unique (user_id, season)

claim_help_requests
  id                     uuid PK
  requester_id           uuid FK -> profiles.id
  season                 text
  fpl_entry_id           integer
  existing_claim_user_id uuid FK -> profiles.id (nullable)
  message                text
  status                 text            -- 'open' | 'resolved'
  created_at             timestamptz
```

## RLS approach

- `profiles`: readable by any authenticated user (needed to show "who's
  connected" / display names), writable only by the owning user.
- `integration_connections`: readable/writable only by the owning user —
  never exposed cross-user, tokens are sensitive regardless of the
  visibility model applied to other tables.
- `league_trophies` / `entry_claims`: readable by any authenticated user;
  writable only via service-role server functions (banking + claim flows).
- `claim_help_requests`: readable/insertable by the requester only; resolved
  manually (no admin UI in v1).
- `player_cards` / `packs` (deferred): same pattern as trophies — readable by
  authenticated users, writes via service role.

## Phases

### Phase 1 — project setup
- Create Supabase project, capture env vars.
- Add `@supabase/supabase-js` dependency.
- Add a server-side Supabase client factory (service-role, for server
  functions) and a browser client factory (anon key, for client components
  that read RLS-scoped data directly).
- Migrations: start a `supabase/migrations` folder (or use the Supabase CLI)
  so schema changes are tracked in the repo rather than made ad hoc in the
  dashboard.

### Phase 2 — accounts
- Decide sign-in method (magic link is the lowest-friction default for a
  small/personal app; add OAuth providers later if useful).
- Add `profiles` table + trigger to create a profile row on new
  `auth.users` insert.
- Wire Supabase Auth into TanStack Start: session cookie handling, a
  `useUser()`/`getUser()` server fn, protected route pattern for anything
  that requires login.
- Add minimal UI: sign in / sign out, show current user in `user-menu.tsx`
  (already exists in the hub — likely the natural place for this).

### Phase 3 — integration_connections table
- Move the Spotify token storage from the original SQLite plan into this
  table, scoped by `user_id` + RLS.
- Update `spotify-connect.md`'s Phase 1 to point here instead of standing up
  its own SQLite DB.

### Phase 4a — soft-claim a seasonal FPL entry
- FPL has no third-party OAuth. Ownership is self-declared: a logged-in
  Deadline user enters their public FPL team ID and confirms the
  entry/manager name shown from the public API.
- Claims are **per season** (`entry_claims`), not a single eternal
  `profiles.fpl_entry_id`, because FPL entry and league IDs reset each year.
- Soft trust for v1: first account to claim a given `(season, fpl_entry_id)`
  wins (`unique`). One linked team per user per season
  (`unique (user_id, season)`).
- If the team ID is already claimed, the UI offers **Get help** → inserts a
  `claim_help_requests` row for manual resolution (no team-name challenge,
  no FPL cookie/token hijacking).
- Implemented in `src/lib/trophies/` + `TrophyClaimSection` in settings.

### Phase 4b — league podium banking
- **Bank vs claim split.** Podium rows (`league_trophies`) are shared league
  facts with no `user_id`. Anyone connecting a team ID after season end can
  trigger the write; later visitors no-op. A user's cabinet is the join of
  their `entry_claims` onto `league_trophies` by `(season, entry_id)`.
- **Trigger:** when a team ID loads in `TeamProvider`, fire-and-forget
  `bankLeagueTrophies` (deduped per team ID per session). Server aborts unless
  `isSeasonComplete(bootstrap.events)`.
- For each classic league on the entry (including Overall): if no rows exist
  for `(league_id, season)`, fetch standings page 1, insert ranks 1–3 with
  denormalized snapshot (`league_name`, `league_size`, `entry_id`,
  `entry_name`, `player_name`, `points`, `margin`). Idempotent via
  `unique (league_id, season, rank)` + upsert ignore-duplicates.
- Season label derived from bootstrap event deadlines (`2025/26`).
- **Display (v1):** basic list under account settings. Wooden-shelf iBooks UI
  deferred.

## Deferred

- **Pack unpacking / card rarities** (player cards, rarity tiers, pull odds)
  is out of scope for now. The `player_cards`/`packs` schema sketched in an
  earlier version of this doc still applies conceptually if picked back up
  later — revisit once the trophy cabinet ships.
- **iOS 6 iBooks wooden-shelf trophy cabinet UI**
- **Team-name challenge verification** (proof-of-control via renaming the FPL
  team to include a code) — revisit if soft-claim abuse shows up
- **Admin dispute-resolution UI** (v1 stores `claim_help_requests` for manual
  handling)

## Open questions

- Season-end detection edge cases: can a mid-season FPL pause falsely trip
  `isSeasonComplete`?
- Trophy medal thresholds beyond top 3 — anything for bigger leagues, or
  strictly rank 1/2/3 regardless of league size?
- Expected user count — stays small/invite-only, or could grow? Affects how
  much dispute tooling is worth investing.
