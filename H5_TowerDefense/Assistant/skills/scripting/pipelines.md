---
name: scripting-pipelines
summary: How to add new hit mechanics (chain, pierce, burn, poison) using the HitService pipeline in H5 TowerDefense.
include: as_needed
---

# Hit Pipeline

## How It Works

`HitService` runs a `reduce` over all registered modifier functions when a projectile detonates.
Each modifier receives `IHitContext` and returns a (possibly modified) `IHitContext`.

```typescript
export interface IHitContext {
  originX: number;          // detonation world X
  originZ: number;          // detonation world Z
  primaryTargetId: number;  // enemy that was directly hit
  targets: number[];        // enemies that will receive damage (expanded by SplashSystem)
  damage: number;           // current damage value (multiplied by CritService if crit)
  props: Record<string, unknown>; // tower stats props — slowFactor, critChance, splashRadius, etc.
}
```

After `HitService.resolve(ctx)`, `ProjectileController` sends `TakeDamage` to each `ctx.targets[i]` with `ctx.props` attached.

## Current Modifiers

| Service | What it does |
|---------|-------------|
| `SplashSystem` | Expands `targets` to all enemies within `props.splashRadius` of `originX/Z` |
| `CritService` | If `Math.random() < props.critChance`: multiplies `damage` × `props.critMultiplier`, sets `props.critHit` |

## Adding a New Mechanic

### Example: Chain Lightning (hits N nearest enemies after primary)

**Step 1** — Add a `chainCount` atom to `UpgradeDefs.ts`:
```typescript
chain: u('Chain', s => {
  const cur = (s.props['chainCount'] as number | undefined) ?? 0;
  return { ...s, props: { ...s.props, chainCount: cur + 1 } };
}),
```

**Step 2** — Create `Services/ChainSystem.ts`:
```typescript
@service()
export class ChainSystem extends Service {
  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    HitService.get().register(ctx => {
      const count = ctx.props['chainCount'] as number | undefined;
      if (!count) return ctx;
      const nearby = TargetingService.get().getEnemiesInRadius(ctx.originX, ctx.originZ, 3.0);
      const chained = nearby
        .filter(id => id !== ctx.primaryTargetId)
        .slice(0, count);
      return { ...ctx, targets: [...ctx.targets, ...chained] };
    });
  }
}
```

**Step 3** — Add to `GameManager._startGame()`:
```typescript
ChainSystem.get();
```

**Step 4** — Add `Upg.chain(cost)` to the desired tower's upgrade tree in `TowerDefs.ts`.

## Props Convention

Props flow from `ITowerStats.props` → `IHitContext.props` → `TakeDamagePayload.props`.

| Prop key | Type | Set by | Read by |
|----------|------|--------|---------|
| `splashRadius` | `number` | Cannon base stats / `Upg.splash` | `SplashSystem` |
| `critChance` | `number` | `Upg.crit` | `CritService` |
| `critMultiplier` | `number` | `Upg.crit` (via UpgradeDefs) | `CritService` |
| `critHit` | `number` | `CritService` (set on crit) | `FloatingTextService` |
| `slowFactor` | `number` | Frost base stats / `Upg.slowFactor` | `SlowService` |
| `slowDuration` | `number` | Frost base stats / `Upg.slowDuration` | `SlowService` |
| `projectileColor` | `{r,g,b}` | All tower base stats | `ProjectileController` |
| `projectileScale` | `number` | Arrow/Frost base stats | `ProjectileController` |

## Adding a Damage-Value Pipeline (if needed)

If armor, resistance, or damage-value transforms are needed in the future, add a new `DamageService` following the same pattern as `HitService` — a `reduce` over registered `(ctx) → ctx` modifiers. Register it in `GameManager._startGame()` and declare its context interface in `Types.ts`.
