---
name: scripting-enemies
summary: How to add or modify enemy types in H5 TowerDefense. Covers IEnemyDef, EnemyDefs.ts, HP scaling, slow system.
include: as_needed
---

# Enemies

## Adding a New Enemy Type

1. Add a template entry in `Assets.ts`:
```typescript
export const MyEnemy = new TemplateAsset('../Templates/Enemies/MyEnemy.hstf');
```

2. Add a def entry in `Defs/EnemyDefs.ts`:
```typescript
{ id: 'myenemy', name: 'MyEnemy', hp: 100, speed: 3.0, reward: 12,
  size: 1, color: { r: 1, g: 0.5, b: 0 }, template: Assets.MyEnemy }
```

3. Reference it in `Defs/LevelDefs.ts` wave groups.

No other files need changing — `EnemyService` reads `ENEMY_DEFS` in `onReady()`.

## IEnemyDef Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique key, used in LevelDefs wave groups |
| `name` | `string` | Display name |
| `hp` | `number` | Base HP (scales per wave, see below) |
| `speed` | `number` | World units per second along path |
| `reward` | `number` | Gold awarded on death |
| `size` | `number` | World-unit radius — affects visual scale and collision |
| `color` | `{r,g,b}` | Applied to all `ColorComponent` children of the entity |
| `template` | `TemplateAsset` | Ref from `Assets.ts` |

## HP Scaling

`hp × (1 + waveIndex × HP_SCALE_PER_WAVE)` where `HP_SCALE_PER_WAVE = 0.15`.
Wave 0 = base HP. Wave 9 (last) = 1 + 9 × 0.15 = 2.35× base HP.

## Slow System

`SlowService` subscribes to `TakeDamage` and checks `props.slowFactor` and `props.slowDuration`.
When present, it calls `EnemyService.get().setSpeedFactor(enemyId, factor)` for the duration.
`EnemyController.onUpdate` reads `speedFactor` from the registry each frame — no component coupling needed.

To make a projectile slow on hit: set `slowFactor` and `slowDuration` in the tower's base `stats.props`
(or via an upgrade atom like `Upg.slowFactor`). The Frost tower uses this mechanism.

## IEnemyRecord (runtime state)

Accessible via `EnemyService.get().get(enemyId)`:

| Field | Description |
|-------|-------------|
| `worldX`, `worldZ` | Current world position (updated every frame) |
| `pathT` | Global path progress [0, 1] — used for targeting priority |
| `hp` | Current HP |
| `maxHp` | Max HP for this wave |
| `speedFactor` | Current speed multiplier (1 = normal, <1 = slowed) |
