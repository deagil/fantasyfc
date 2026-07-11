# Trophy visuals

Silverware hub marks support two visuals. The modular parts system stays in the
repo so it can be restored without rewriting the tile.

## Current default: award badges

`TROPHY_VISUAL_STYLE` in [`trophy-visual.ts`](./trophy-visual.ts) is `"award"`.

- Rounded hexagon Apple Watch–style badge (Perfect Week silhouette)
- Shared **silver metal** frame; full-face enamel is the tier colour (gold / silver / bronze)
- Metal-outlined rank digit
- Designed to convert cleanly to a physical badge later
- Rendered by [`award-trophy-svg.tsx`](../../components/award-trophy-svg.tsx)

## Modular procedural trophies (dormant)

Set `TROPHY_VISUAL_STYLE` to `"modular"` to switch back.

```
leagueId → hash/mulberry32 → { body, handles, stem, base }
medal → fill / stroke palette
```

| Slot | Variants |
| --- | --- |
| body | `urn`, `bowl`, `chalice` |
| handles | `ears`, `none`, `wings` |
| stem | `short`, `ringed`, `tall` |
| base | `stepped`, `disc`, `plinth` |

- Resolver: [`trophy-visual.ts`](./trophy-visual.ts) — `resolveTrophyParts(leagueId)`
- Path catalog: [`trophy-parts.ts`](./trophy-parts.ts) — expand by adding map entries
- Composer: [`modular-trophy-svg.tsx`](../../components/modular-trophy-svg.tsx)
- Entry point: [`trophy-mark.tsx`](../../components/trophy-mark.tsx) — picks award vs modular
- Detail route: [`/trophy/$leagueId`](../../routes/trophy/$leagueId.tsx) — large badge + award metadata; opened from Silverware tile clicks

Same `leagueId` always remashes the same way. Medal never affects the shape seed.

## Switching

1. Open [`trophy-visual.ts`](./trophy-visual.ts)
2. Change `TROPHY_VISUAL_STYLE` from `"award"` to `"modular"` (or back)
3. No tile or catalog changes required
