---
name: scripting-vfx-and-coins
summary: How VfxService and CoinService work in H5 TowerDefense — particle pools, hit flash, death FX, loot coins.
include: as_needed
---

# VFX & Coins

## VfxService

Manages a pre-spawned pool of particle entities (size set by `VFX_POOL_SIZE` in `Constants.ts`).

### How it works

1. `prewarm()` spawns all particles at `PARK_POS` during game init.
2. On `TakeDamage` → `hitFlash(enemyId)`: briefly tints the enemy white via `EnemyController.applyTint()`, then resets.
3. On `TakeDamage` → `spawnImpact(x, z)`: acquires 3 particles from pool, launches with random velocity and gravity, returns them when faded.
4. On `EnemyDied` → `spawnDeath(x, z)`: acquires 6 particles, larger burst, same physics.

Particle physics: each particle has `(vx, vy, vz)` velocity, gravity pulls Y down, alpha fades over lifetime. All handled in `VfxService.onUpdate`.

### Adding a new particle effect

Add a method to `VfxService` that calls `_acquire()`, sets initial state, and adds to `_active`. No new files needed unless the effect needs distinct particle visuals.

---

## CoinService

Pre-spawned pool of `COIN_POOL_SIZE` (75) coin entities. Each coin is driven by `CoinController`.

### Flow

1. On `EnemyDied`: `CoinService` emits `ActivateCoin` events (3–8 per kill) to idle pool entities.
2. `CoinController.onActivate`: launches coin with random arc (launch Vy, lateral spread).
3. Physics: bounces once on ground, rolls with friction, then glides toward the player collection point.
4. On collect (proximity to player or auto-collect timer): fires `CoinCollected` → `ResourceService.earn(amount)`.

### Adjusting coin behavior

All tuning values (`LAUNCH_VY_MIN/MAX`, `COIN_GRAVITY`, `COIN_FRICTION`, `COIN_COLLECT_RADIUS`) are constants in `CoinController.ts`. They are intentionally co-located with the physics logic rather than in `Constants.ts` since they are purely cosmetic and not referenced from other files.

### Adding a new collectible type

Follow the same pattern: new pool service + controller component + `ActivateX` / `XCollected` events in `Types.ts`.
