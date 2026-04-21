---
name: architecture
summary: H5 TowerDefense high-level architecture — event-driven services, pipeline pattern, no direct component refs
include: always
---

# Architecture

## Core Rules

- **No direct component references** — all communication via `EventService.sendLocally()`
- **One class per file**, file name matches class name
- **Services orchestrate**, components handle local visuals and state
- **New features = new files**; modify existing files only when strictly necessary

## Services vs Components

| | Service (`@service`) | Component (`@component`) |
|---|---|---|
| Lifetime | Singleton, lives forever | Tied to entity lifecycle |
| Access | `MyService.get()` anywhere | Via `@subscribe` only |
| State | Persistent (reset in `@subscribe(RestartGame)`) | Reset on entity destroy/init |
| Use for | Business logic, registries, pools, pipelines | Visuals, entity-local behavior |

## Event-Driven Communication

```typescript
// Broadcast
EventService.sendLocally(Events.EnemyDied, { enemyId: 42, reward: 10, worldX: 1, worldZ: 2 });

// Target one entity
EventService.sendLocally(Events.InitEnemy, { defId: 'basic', waveIndex: 0 }, { eventTarget: entity });

// Subscribe (service or component)
@subscribe(Events.EnemyDied)
onEnemyDied(p: Events.EnemyDiedPayload): void { ... }
```

All events declared in `Types.ts` → `namespace Events`. Never elsewhere.

## Pipeline Pattern

`HitService` is a reducer pipeline. A modifier is a pure function `ctx → ctx`.
New mechanics self-register in `onReady()`:

```typescript
@service()
export class BurnSystem extends Service {
  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    HitService.get().register(ctx => {
      // inspect ctx.props, return modified ctx
      return ctx;
    });
  }
}
```

Then add one line to `GameManager._startGame()`: `BurnSystem.get();`

## IHitContext → TakeDamage flow

```
TowerController fires
  → ProjectileController._detonate()
    → HitService.resolve(ctx)          ← SplashSystem, CritService run here
      → for each target: TakeDamage   ← props from hitCtx.props (includes isCrit, critHit…)
        → EnemyController.onTakeDamage
        → SlowService (applies slow if slowFactor in props)
        → FloatingTextService (shows crit text if critHit in props)
```

## Def Files (pure data)

`TowerDefs`, `EnemyDefs`, `LevelDefs` export const arrays — no side effects, no service calls.
Catalog services read them in `onReady()`. Adding a new tower/enemy = adding an entry to the array.

`LevelDefs` owns path waypoints via `ILevelDef.pathWaypoints` — there is no separate `PathDefs` import needed. `PathService` reads `LEVEL_DEFS[0].pathWaypoints` in `onReady()`.

## Assets

`Assets.ts` is the **only** file with `new TemplateAsset(...)`.
Never via `@property()`, never in def files, never in components.
