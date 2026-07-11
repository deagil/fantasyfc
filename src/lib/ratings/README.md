# Player rating system

FIFA-style 10–100 player ratings rebuilt from backroom's `data_processing/overall_plus.js`,
optimised for the web stack: computed server-side, persisted to Supabase per gameweek,
served to the client as compact summaries.

## Getting started

### Prerequisites

1. Supabase project with the usual app env vars set (local `.env` or deployment):
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (or `SUPABASE_*` equivalents)
   - `SUPABASE_SERVICE_ROLE_KEY` — required; ratings read/write via the service role
2. Magic-link auth working (seeding requires a signed-in user)

### 1. Apply the migration

Run [`supabase/migrations/0005_player_ratings.sql`](../../../supabase/migrations/0005_player_ratings.sql)
against your project (CLI `supabase db push`, SQL editor, or your usual migration flow).

This creates:

| Table | Purpose |
|---|---|
| `player_season_history` | Past-season aggregates (vaastav seed) → expected baselines |
| `player_ratings` | Per-(season, event, player) snapshots |

Both tables have RLS enabled with **no client policies** — only the service role
(via server functions) can touch them.

### 2. Seed historical baselines (once per season)

With the app running and yourself signed in, call `seedRatingsHistory` once.
There is no UI for this yet; a temporary call from any authenticated page works:

```tsx
import { useServerFn } from "@tanstack/react-start"
import { seedRatingsHistory } from "@/lib/ratings/server"

// inside a signed-in component / effect / button handler:
const seed = useServerFn(seedRatingsHistory)
const result = await seed()
// { seasons: [{ season, players, source }, ...], skipped: string[] }
```

What it does:

- Derives the current season from bootstrap events
- Fetches the previous 3 seasons' `players_raw.csv` from
  [vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League)
- Upserts into `player_season_history` (idempotent — safe to re-run)
- Seasons not yet published in the repo land in `skipped`

Re-run at the start of each new season so the newly finished year enters the
rolling 3-season window.

### 3. Compute the first snapshot

No extra step — the first call to `getPlayerRatings` (or any hook that uses it)
computes, persists, and returns the payload:

```tsx
import { usePlayerRatings, usePlayerRatingDetail } from "@/lib/ratings/hooks"

const { data, isLoading, error } = usePlayerRatings()
// data: { season, event, computedAt, ratings: PlayerRatingSummary[] }

const detail = usePlayerRatingDetail(playerId) // full category/sub/stat tree
```

After that, the same `(season, event)` snapshot is reused from Supabase; an
in-memory 3h cache keeps repeat server calls off the DB. As gameweeks advance,
new snapshots accumulate and give per-player rating history for free.

### 4. Verify

```bash
pnpm test -- src/lib/ratings
```

Unit + snapshot tests live in `engine.test.ts` and `vaastav.test.ts`.

### Without history seed

Ratings still compute from current bootstrap stats alone. Blend falls back to
current-only (`expectedOverall` / baselines null, trend `no_baseline`). Seed
history for meaningful early-season and pre-season numbers.

## The six categories

Every player gets an overall plus six category scores (keepers swap ATK for GKP):

| Category | Meaning | Sub-categories |
|---|---|---|
| ATK | Attack | Goalscoring, Threat |
| PLY | Playmaking | Creation, Creativity |
| IMP | Impact | Influence, Efficiency |
| DEF | Defence | Actions, Outcomes, Discipline |
| REL | Reliability | Playing Time |
| FPL | FPL Value | Market |
| GKP | Goalkeeping | Shot Stopping, Conceding |

Source of truth for weights: [`hierarchy.ts`](./hierarchy.ts).
Stat derivation: [`stats.ts`](./stats.ts).

## How a score is calculated

1. **Derive** a flat `Record<statKey, number | null>` per player
   (`deriveBootstrapStats` for current season, `deriveHistoryStats` for past).
2. **Cohort** — for each position (GKP/DEF/MID/FWD), collect players with ≥90
   minutes. For each leaf stat, build a sorted distribution. Drop the stat if
   fewer than 8 samples or zero variance (sibling weights renormalise).
3. **Percentile** — each player's value → fraction of cohort ≤ that value
   (open interval). Stats marked `lowerIsBetter` invert (`1 - p`).
4. **Curve** — percentile → 10–100 via `RATING_CURVE_ANCHORS` (compressed
   bottom, steep elite tail).
5. **Roll-up** — weighted average of available leaf ratings → sub-category →
   category. Missing/skipped stats drop out; weights renormalise.
6. **Damping** — once, at category level:
   `damped = damping × raw + (1 − damping) × 50`, where
   `damping = min(1, minutes / assessThreshold)`. Full assessment = 450 minutes
   (~5 games), scaled early season as `event × 45` (floor 90).
7. **Overall** — weighted average of that position's categories
   (`POSITION_CATEGORY_WEIGHTS`).
8. **Blend** — overall/categories mixed with historical baselines
   (see Pipeline / `blend.ts`).

### Position → category weights

| Position | GKP | ATK | PLY | IMP | DEF | REL | FPL |
|---|---|---|---|---|---|---|---|
| GK (1) | 0.70 | — | 0.05 | 0.08 | 0.05 | 0.10 | 0.02 |
| DEF (2) | — | 0.11 | 0.22 | 0.19 | 0.30 | 0.10 | 0.08 |
| MID (3) | — | 0.29 | 0.19 | 0.19 | 0.15 | 0.10 | 0.08 |
| FWD (4) | — | 0.43 | 0.23 | 0.11 | 0.05 | 0.10 | 0.08 |

A dash means the category is not computed for that position.

### Notation in the tables below

- **W** — weight within its parent (sub within category, or leaf within sub).
- **↓** — `lowerIsBetter` (fewer / lower is better; percentile inverted).
- **per90(x)** — `(x × 90) / minutes`; null if minutes ≤ 0 or x is null.
- Bootstrap prefers FPL's own `*_per_90` fields when the API provides them;
  history always derives per-90 from season totals.

## Stat & sub-category reference

### ATK — Attack

Outfield finishing and chance quality. Keepers do not get ATK.

#### Goalscoring (W 0.65)

| Stat | W | Tracks | Current (bootstrap) | Historical |
|---|---|---|---|---|
| `xg_per_90` | 0.40 | Expected goals rate — quality of chances | `expected_goals_per_90` | `per90(expected_goals)` |
| `goals_per_90` | 0.30 | Actual goals rate | `per90(goals_scored)` | same |
| `goals_scored` | 0.25 | Season goal total (body of work) | `goals_scored` | same |
| `penalties_missed` ↓ | 0.05 | Missed pens (season total) | `penalties_missed` | same |

#### Threat (W 0.35)

| Stat | W | Tracks | Current | Historical |
|---|---|---|---|---|
| `threat_per_90` | 0.50 | FPL ICT Threat / 90 — shots, touches in box, etc. | `per90(threat)` | same |
| `xgi_per_90` | 0.50 | Expected goal involvements (xG+xA) / 90 | `expected_goal_involvements_per_90` | `per90(expected_goal_involvements)` |

### PLY — Playmaking

Chance creation and creative output.

#### Creation (W 0.70)

| Stat | W | Tracks | Current | Historical |
|---|---|---|---|---|
| `xa_per_90` | 0.45 | Expected assists rate | `expected_assists_per_90` | `per90(expected_assists)` |
| `assists_per_90` | 0.30 | Actual assists rate | `per90(assists)` | same |
| `assists` | 0.25 | Season assist total | `assists` | same |

#### Creativity (W 0.30)

| Stat | W | Tracks | Current | Historical |
|---|---|---|---|---|
| `creativity_per_90` | 1.00 | FPL ICT Creativity / 90 — chances created, key passes | `per90(creativity)` | same |

### IMP — Impact

All-round match influence and FPL scoring efficiency.

#### Influence (W 0.50)

| Stat | W | Tracks | Current | Historical |
|---|---|---|---|---|
| `ict_per_90` | 0.40 | Combined ICT Index / 90 | `per90(ict_index)` | same |
| `bps_per_90` | 0.35 | Bonus Points System score / 90 | `per90(bps)` | same |
| `bonus_per_90` | 0.25 | Bonus points awarded / 90 | `per90(bonus)` | same |

#### Efficiency (W 0.50)

| Stat | W | Tracks | Current | Historical |
|---|---|---|---|---|
| `points_per_game` | 0.50 | FPL points per appearance | `points_per_game` | always `null` (not in history) → dropped, weights renormalise |
| `points_per_90` | 0.30 | Total points rate | `per90(total_points)` | same |
| `total_points` | 0.20 | Season FPL points | `total_points` | same |

### DEF — Defence

Defensive volume, clean-sheet outcomes, and discipline.

#### Actions (W 0.45)

| Stat | W | Tracks | Current | Historical |
|---|---|---|---|---|
| `defcon_per_90` | 0.35 | FPL defensive contribution / 90 (post-2025) | `defensive_contribution_per_90` | `per90(defensive_contribution)` — often all-zero pre-2025 → skipped |
| `cbi_per_90` | 0.30 | Clearances + blocks + interceptions / 90 | `per90(clearances_blocks_interceptions)` | same |
| `tackles_per_90` | 0.20 | Tackles / 90 | `per90(tackles)` | same |
| `recoveries_per_90` | 0.15 | Ball recoveries / 90 | `per90(recoveries)` | same |

#### Outcomes (W 0.35)

| Stat | W | Tracks | Current | Historical |
|---|---|---|---|---|
| `clean_sheets_per_90` | 0.55 | Clean sheet rate | `clean_sheets_per_90` | `per90(clean_sheets)` |
| `xgc_per_90` ↓ | 0.45 | Expected goals conceded / 90 (lower = better) | `expected_goals_conceded_per_90` | `per90(expected_goals_conceded)` |

#### Discipline (W 0.20)

| Stat | W | Tracks | Current | Historical |
|---|---|---|---|---|
| `yellow_per_90` ↓ | 0.50 | Yellow cards / 90 | `per90(yellow_cards)` | same |
| `red_per_90` ↓ | 0.30 | Red cards / 90 | `per90(red_cards)` | same |
| `own_goals` ↓ | 0.20 | Own goals (season total) | `own_goals` | same |

### REL — Reliability

Availability / minutes — the only place season minutes are rewarded heavily
(per-90 categories already rate *rate*, not volume).

#### PlayingTime (W 1.00)

| Stat | W | Tracks | Current | Historical |
|---|---|---|---|---|
| `minutes` | 0.60 | Season minutes played | `minutes` | same |
| `starts_per_90` | 0.40 | Start rate | `starts_per_90` (API) | `per90(starts)` |

### FPL — FPL Value

Points return relative to price. Intentionally narrow (no ownership / transfer
volume terms).

#### Market (W 1.00)

| Stat | W | Tracks | Current | Historical |
|---|---|---|---|---|
| `points_per_million` | 0.60 | `total_points × 10 / now_cost` (cost is in tenths of £m) | from `total_points`, `now_cost` | from `total_points`, `end_cost` |
| `value_season` | 0.20 | FPL's season value metric | `value_season` | always `null` → dropped |
| `value_form` | 0.20 | FPL's recent form value metric | `value_form` | always `null` → dropped |

Historically only `points_per_million` survives, so Market collapses to that
alone after renormalisation.

### GKP — Goalkeeping

Keepers only (replaces ATK). Shot stopping vs goals prevented / conceded.

#### ShotStopping (W 0.50)

| Stat | W | Tracks | Current | Historical |
|---|---|---|---|---|
| `saves_per_90` | 0.50 | Saves rate | `saves_per_90` | `per90(saves)` |
| `saves` | 0.25 | Season save total | `saves` | same |
| `penalties_saved` | 0.25 | Pens saved (season total) | `penalties_saved` | same |

#### Conceding (W 0.50)

| Stat | W | Tracks | Current | Historical |
|---|---|---|---|---|
| `clean_sheets_per_90` | 0.45 | Clean sheet rate | `clean_sheets_per_90` | `per90(clean_sheets)` |
| `xgc_per_90` ↓ | 0.35 | Expected goals conceded / 90 | `expected_goals_conceded_per_90` | `per90(expected_goals_conceded)` |
| `goals_conceded_per_90` ↓ | 0.20 | Goals conceded / 90 | `goals_conceded_per_90` | `per90(goals_conceded)` |

### Design notes on the leaves

- **Per-90 first, totals secondary** — rate stats dominate; season totals
  (`goals_scored`, `assists`, `saves`, `total_points`, …) are small “body of
  work” terms so starters edge cameo merchants without double-counting minutes
  (REL already covers volume).
- **No double-counting** — each leaf key appears in at most one sub-category
  (backroom put CBI/tackles in two DEF subs).
- **Era gaps** — xG-family stats pre-~2022 and defensive contribution pre-~2025
  are missing or all-zero historically; zero-variance drop + renormalise keeps
  past seasons usable.
- **Tuning** — change weights, curve anchors, or thresholds only in
  `hierarchy.ts`; change how a key is derived in `stats.ts`.

## Pipeline

```
bootstrap-static (full, cached 3h)          player_season_history (Supabase,
        │                                    seeded from vaastav players_raw.csv)
        ▼                                            │
 deriveBootstrapStats()                      deriveHistoryStats() per season
        │                                            │
        ▼                                            ▼
 computeRatings(players, { event })          computeRatings() per past season
        │                                            │
        │                                    computeExpectedBaselines()
        │                                    (recency + minutes weighted, last 3 seasons)
        └────────────► blendRatings() ◄──────────────┘
                            │
                    calibrateRatings()
                    (per-position quantile → target FIFA distribution)
                            │
                  persistSnapshot() → player_ratings (season, event, player, algo_version)
                            │
                  getPlayerRatings / getPlayerRatingDetail server fns
                            │
                  usePlayerRatings / usePlayerRatingDetail hooks
```

Blend weights by phase: pre-season 0/100 current/historical, GW1–8 40/60, GW9–20 60/40,
GW21+ 80/20. A player's individual current weight is additionally scaled by their
assessment damping, so an unplayed/injured player leans on their baseline instead of
being dragged to ~50. Two guards keep baselines honest: players with departed FPL
statuses (`u`/`n` — transferred out, ineligible) lose their baseline entirely, and
active players who aren't playing have their expected rating decay toward 50 after a
4-gameweek grace window (up to half the distance to neutral by full absence) — so a
player who left in the summer can't sit at #2 in May on memory. Full assessment
requires 900 minutes (~10 matches, scaled down early season); below that, ratings damp
toward 50 so hot per-90 numbers from 300 minutes can't outrank proven full-season
output.

## Client API

| Hook / fn | Returns |
|---|---|
| `usePlayerRatings()` | Compact list for the latest snapshot |
| `usePlayerRatingsById()` | Same data as `Map<elementId, summary>` |
| `usePlayerRatingDetail(playerId)` | Full category → sub → stat breakdown |
| `getPlayerRatings` | Server fn behind the list hooks |
| `getPlayerRatingDetail` | Server fn behind the detail hook |
| `seedRatingsHistory` | One-shot history seed (auth required) |

Query keys / stale time: `queries.ts` (`RATINGS_STALE_TIME` = 3h).

Shared types (`PlayerRatingSummary`, `PlayerRatingsPayload`, etc.) live in
`model.ts` and are safe to import on the client.

## Overall calibration

The raw overall is a weighted average of category averages, which regresses to the
middle: even the league's best player tops out ~85 because nobody is elite in every
category (an attacking midfielder's DEF sits near 50 by construction). FIFA has the
same property and solves it with a final mapping onto a designed distribution — so do
we. `calibrate.ts` maps each position's raw blended overalls onto
`OVERALL_CALIBRATION_ANCHORS` via quantiles: the best player per position lands ~95,
the top ~1% at ~91, the top 5% in the mid-to-high 80s. The map is a monotone piecewise
stretch, so order and gaps are preserved and unassessed players pass through the same
curve without inflating. Category scores are not calibrated (direct percentiles,
already spread to 99), which is why a card can read "overall 95, ATK 84, PLY 99" —
same as FIFA. Snapshots carry `algo_version` (`RATINGS_ALGO_VERSION` in hierarchy.ts);
bump it when the algorithm changes so stale stored snapshots are recomputed.

## Deliberate changes from backroom

- **Per-position percentile cohorts** (players with 90+ minutes) — a defender's ATK is
  measured against defenders. This replaces backroom's post-hoc position multipliers,
  which saturated at 100 and distorted the scale.
- **Per-90-first stat weighting**; season totals remain only as small "body of work"
  terms. Backroom's totals-heavy percentiles rewarded minutes twice (REL already covers it).
- **No double counting** — CBI/tackles appeared in two DEF sub-categories before.
- **Damping applied once** (category level). Backroom damped categories *and* overall
  *and* applied a confidence multiplier — triple shrink toward 50. Confidence is now
  metadata only.
- **Zero-variance/undersampled distributions are skipped** and sibling weights
  renormalise. This is also what makes historical seasons work: stats FPL didn't track
  yet (xG pre-2022, defensive contribution pre-2025) drop out cleanly.
- **No hardcoded gameweek/season** — both derived from bootstrap events.
- **History from the vaastav/Fantasy-Premier-League repo** — one `players_raw.csv`
  fetch per season (last 3), each holding the *whole league* for that year, stored in
  Supabase in `history_past` shape. No manual CSV curation, no per-player API crawling,
  and historical percentile cohorts are unbiased (not just players still in the game).
  Baselines recency-weight the last 3 seasons and down-weight injury-shortened ones.
  Caveat: the repo's most recent season reflects its latest commit, which may lag the
  final gameweek slightly — percentile-based ratings are insensitive to this.
- **FPL Value cleaned** — points-per-million, value_season, value_form. Dropped the
  contrarian selected-by% term and the "transfers in AND out are both good" weights.

## Operations

- **Seeding history** (once, then each new season): see [Getting started](#2-seed-historical-baselines-once-per-season).
- **Snapshots**: `getPlayerRatings` computes once per (season, gameweek) and reuses the
  Supabase snapshot afterwards; an in-memory 3h cache keeps repeat calls off the DB.
  Accumulated snapshots give per-player rating history over the season for free.
- **Tuning**: all weights, curve anchors, and thresholds live in `hierarchy.ts`.
- **Blend phases**: `getBlendWeights` / `classifyTrend` in `blend.ts`.

## Files

- `model.ts` — shared types (client-safe)
- `hierarchy.ts` — category/stat weight trees, position weights, curve, thresholds
- `stats.ts` — raw FPL element / history row → flat stat record
- `engine.ts` — pure rating computation (cohorts, percentiles, roll-up)
- `history.ts` — historical season ratings → expected baselines
- `vaastav.ts` — CSV parsing + mapping of vaastav players_raw.csv seasons
- `blend.ts` — current × expected blending, trend classification (pre-season →
  `preseason` trend, no gap), absence decay, departed-status baseline exclusion
- `calibrate.ts` — final per-position overall calibration to the target distribution
- `server.ts` — server fns: `getPlayerRatings`, `getPlayerRatingDetail`, `seedRatingsHistory`
- `queries.ts` / `hooks.ts` — TanStack Query keys and hooks
- `engine.test.ts` / `vaastav.test.ts` — unit + snapshot / CSV mapping tests
