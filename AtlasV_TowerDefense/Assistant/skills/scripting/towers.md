---
name: scripting-towers
summary: How to add a new tower type to H5 TowerDefense. Covers ITowerDef, Assets.ts, TowerDefs.ts, upgrade tree, template requirements.
include: as_needed
---

# Adding a New Tower

## Checklist

- [ ] 1. Add template to `Assets.ts`
- [ ] 2. Add def entry to `TowerDefs.ts` with upgrade tree
- [ ] 3. Create `.hstf` template in `Templates/Towers/` with `TowerController` component
- [ ] 4. Add shop entry (automatic — `TowerShopHud` reads `TOWER_DEFS`)

> **Shop limit**: `TowerShopHud` has 4 fixed button slots. Adding a 5th tower requires updating the XAML panel and the ViewModel.

## Step 1 — Assets.ts

```typescript
export const MyTower = new TemplateAsset('../Templates/Towers/MyTower.hstf');
```

## Step 2 — TowerDefs.ts

```typescript
{
  id: 'mytower', name: 'MyTower', cost: 120,
  stats: {
    damage: 20,
    range: 3.0,
    fireRate: 1.0,
    projectileSpeed: 8,
    props: {
      projectileColor: { r: 1.0, g: 0.0, b: 0.5 },
      projectileScale: 0.10,
      // add mechanic props here: splashRadius, slowFactor, etc.
    }
  },
  template: Assets.MyTower,
  upgrades: tree(
    [Upg.damage(120),  Upg.range(120)],
    [[Upg.rate(180),   Upg.damage(180)],   [Upg.damage(180),  Upg.rate(180)]],
    [[Upg.damage(360), Upg.rate(360)],     [Upg.rate(360),    Upg.damage(360)],
     [Upg.range(360),  Upg.damage(360)],   [Upg.damage(360),  Upg.range(360)]],
  ),
}
```

## ITowerDef Fields

| Field | Description |
|-------|-------------|
| `id` | Unique string key |
| `name` | Display name in shop |
| `cost` | Purchase price in gold |
| `stats.damage` | Base damage per projectile |
| `stats.range` | Targeting radius in world units |
| `stats.fireRate` | Shots per second |
| `stats.projectileSpeed` | World units per second |
| `stats.props` | Arbitrary extra data forwarded to the hit pipeline |
| `template` | TemplateAsset from `Assets.ts` |
| `upgrades` | Binary upgrade tree built with `tree()` |

## Template Requirements

The `.hstf` template entity must have `TowerController` attached.
`TowerController` handles targeting and firing automatically — no extra scripting needed.

Projectile visuals are driven by `props.projectileColor` and `props.projectileScale` set in `ProjectileController.onInit`.

## Mechanic Props Reference

`stats.props` flows through the hit pipeline into `IHitContext.props` and `TakeDamagePayload.props`.

| Prop | Type | Required | Effect |
|------|------|----------|--------|
| `projectileColor` | `{r,g,b}` | **yes** | Sets projectile mesh color in `ProjectileController.onInit` |
| `projectileScale` | `number` | **yes** | Sets projectile mesh scale |
| `splashRadius` | `number` | no | AoE on hit (handled by `SplashSystem`) |
| `slowFactor` | `number (0–1)` | no | Slow multiplier on hit (handled by `SlowService`) |
| `slowDuration` | `number` | no | Slow duration in seconds |
| `critChance` | `number (0–1)` | no | Crit probability (handled by `CritService`) |
| `critMultiplier` | `number` | no | Crit damage multiplier (default `CRIT_MULTIPLIER` from `Constants.ts`) |

## Cost Balancing Rule (for upgrade tree)

| Tier | Max cost |
|------|----------|
| T1 | ≤ tower base cost |
| T2 | ≤ 1.5 × tower base cost |
| T3 | ≤ 3 × tower base cost |

## Design Constraints

- No `slowFactor`/`slowDuration` on non-support towers (Frost identity)
- No `crit` unless intentional — only Arrow has it as a full identity
- No `range` × 3 paths (i.e., range in T1 + T2 + T3) — creates extreme reach
- No `splash` on Arrow
