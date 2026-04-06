# H5 Tower Defense — Project Summary

## Concept

Single-player mobile tower defense, portrait orientation, for Meta Horizon Worlds.
The player places towers on a 9×12 world-unit grid during build phases to stop waves of enemies from reaching the end of a snake path.
Core tension: strategic placement (choke points, range overlap) vs. economy management (gold per kill, upgrade vs. new tower decisions).

---

## Platform & Stack

| Item | Value |
|------|-------|
| Platform | Meta Horizon Studio (MHS) |
| Language | TypeScript ES2022 |
| Target | Mobile portrait, local single-player |
| Grid | 18×24 cells × 0.5 world units = **9×12 world units**, centered on origin |
| Play area | Grid ~70% screen height; HUD top ~10%, Shop bottom ~20% |

---

## Architecture

### Principle
Event-driven, no direct component references. Each service owns one responsibility.
New features are new files — existing files are only modified when necessary.

### Communication
All gameplay communication via `EventService.sendLocally()`.

### Pipeline Services
One resolution pipeline — a `reduce` over registered modifier closures:

| Service | Pipeline | Current modifiers |
|---------|----------|-------------------|
| `HitService` | `IHitContext → IHitContext` | `SplashSystem` (AoE target expansion), `CritService` (crit damage × multiplier) |

Adding a new mechanic (chain, pierce, burn…) = one new `@service()` that calls `HitService.get().register(modifier)` in `onReady()`, then one import line in `GameManager`.

---

## File Structure

```
Scripts/
  Types.ts          — Enums, interfaces, pipeline contexts, all LocalEvents
  Constants.ts      — Grid dims, timing, economy values, crit multiplier
  Assets.ts         — ALL TemplateAsset declarations (single source of truth)

  Defs/
    TowerDefs.ts    — TOWER_DEFS: ITowerDef[] (4 towers + upgrade trees)
    EnemyDefs.ts    — ENEMY_DEFS: IEnemyDef[] (4 enemy types)
    LevelDefs.ts    — LEVEL_DEFS: ILevelDef[] (10 waves, 1 level)
    PathDefs.ts     — PATH_WAYPOINTS_LEVEL_0 (snake path top→bottom)
    UpgradeDefs.ts  — Upg atoms catalog + tree() builder

  Services/
    PathService         — waypoint path, cellToWorld(), isPathCell()
    TowerService        — selectedId, place on GridTapped, upgrade, sell
    EnemyService        — live enemy registry (worldX, worldZ, pathT, hp, speedFactor)
    ResourceService     — gold, lives, earn(), spend(), loseLife(), reset()
    TargetingService    — getBestTarget(), getEnemiesInRadius()
    WaveService         — state machine: Build → Wave → WaveClear → loop
    PlacementService    — drag-to-place input handler + preview + range indicator
    HitService          — hit target expansion pipeline
    SplashSystem        — registers AoE modifier into HitService
    SlowService         — subscribes to TakeDamage, applies slowFactor to enemies
    CritService         — registers crit modifier into HitService (arrow/cannon only)
    ProjectilePool      — pre-spawned projectile pool (30 entities)
    HealthBarService    — pre-spawned health bar pool (30 entities)
    FloatingTextService — pools floating text entities; shows gold on death, crit multiplier on hit

  Components/
    GameManager         — onStart prewarm, onUpdate tick, game start/end/restart
    ClientSetup         — camera (Fixed mode), FocusedInteraction enable
    TowerController     — per-frame targeting + firing
    EnemyController     — path follow, TakeDamage handler, die/reach-end
    ProjectileController — homing movement, detonate via HitService pipeline
    HealthBarController  — follows enemy, updates fill
    FloatingTextController — animates rising/fading colored text
    GameHudController    — ViewModel for gold/lives/wave HUD
    TowerShopHud         — ViewModel for tower purchase bar
    TowerUpgradeMenuHud  — ViewModel for upgrade/sell panel
    GameOverScreenHud    — ViewModel for end screen + stats
    WaveBannerHud        — ViewModel for wave announcement banner (WAVE X, animated)
```

---

## Towers

| ID | Name | Cost | Damage | Range | Fire Rate | Splash | Notes |
|----|------|------|--------|-------|-----------|--------|-------|
| `arrow` | Arrow | 50g | 10 | 3.5 | 1.5/s | — | Crit capable (arrow-only) |
| `cannon` | Cannon | 100g | 35 | 2.5 | 0.6/s | r=1.0 | Crit capable |
| `frost` | Frost | 80g | 4 | 3.0 | 1.0/s | — | Slow 50% / 1.5s |
| `laser` | Laser | 200g | 8 | 5.0 | 5.0/s | — | Highest base DPS |

---

## Upgrade System

Each tower has a binary upgrade tree: 3 tiers, 2 choices per tier → 8 possible end-states per tower.

```
T1 (1 choice)
├── T2-L (choice A) → T3-LL / T3-LR
└── T2-R (choice B) → T3-RL / T3-RR
```

Cost rule: T1 ≤ tower cost, T2 ≤ 1.5× tower cost, T3 ≤ 3× tower cost.

### Available upgrade atoms (`UpgradeDefs.ts`)

| Atom | Effect | Restriction |
|------|--------|-------------|
| `Upg.rate` | fireRate × 2 | — |
| `Upg.damage` | damage × 2 | — |
| `Upg.range` | range + 2.0 | Laser: max 1× per path |
| `Upg.splash` | splashRadius + 0.8 | Arrow: never |
| `Upg.slowFactor` | slowFactor × 0.7 (min 0.15) | Frost only |
| `Upg.slowDuration` | slowDuration + 1.0 | Frost only |
| `Upg.crit` | critChance + 0.20 (max 0.80) | Arrow (×2 per path max), Cannon (×1) |

Crit multiplier is `CRIT_MULTIPLIER = 2.5` (defined in `Constants.ts`, applied in `CritService`).
When a crit fires, `FloatingTextService` shows the multiplier in red above the enemy.

---

## Enemies

| ID | Name | HP | Speed | Reward |
|----|------|----|-------|--------|
| `basic` | Basic | 60 | 2.5/s | 5g |
| `fast` | Fast | 35 | 5.0/s | 8g |
| `tank` | Tank | 220 | 1.5/s | 15g |
| `boss` | Boss | 600 | 1.2/s | 50g |

HP scales +15% per wave: `hp × (1 + waveIndex × 0.15)`.

---

## Economy

| Parameter | Value |
|-----------|-------|
| Start gold | 150g |
| Start lives | 20 |
| Wave bonus | +25g at end of each wave |
| Sell refund | 60% of total invested (tower + upgrades) |

---

## Game Phases

```
Idle → Build (5s) → Wave → WaveClear (0.5s) → Build → … → Victory
                                                            ↓
                                                         GameOver (lives = 0)
```

---

## UI Panels

| Panel | File | Phase | Status |
|-------|------|-------|--------|
| **HUD** | `UI/GameHud.xaml` | Always | ✅ |
| **Tower Shop** | `UI/TowerShop.xaml` | Build + Wave | ✅ |
| **Tower Upgrade Menu** | `UI/TowerUpgradeMenu.xaml` | Tower selected | ✅ — 4-column layout: [Info Panel] [Upgrade1] [Upgrade2] [Sell]. Info panel shows tower name + upgrade history (up to 3 lines). Upgrade buttons hidden when tower is at max tier (3). |
| **Game Over / Victory** | `UI/GameOverScreen.xaml` | End | ✅ |
| **Wave Banner** | UI/WaveBanner.xaml | Wave start | ✅ |

---

## Events Reference

| Event | Key payload fields | Primary consumers |
|-------|-------------------|-------------------|
| `GamePhaseChanged` | `phase: GamePhase` | HUD, GameManager |
| `ResourceChanged` | `gold, lives` | HUD |
| `WaveStarted` | `waveIndex, totalWaves` | HUD |
| `WaveCompleted` | `waveIndex` | WaveService |
| `GridTapped` | `col, row` | TowerService |
| `InitTower` | `defId, col, row` | TowerController |
| `InitEnemy` | `defId, waveIndex` | EnemyController |
| `InitProjectile` | `targetEnemyId, damage, speed, props` | ProjectileController |
| `TakeDamage` | `enemyId, damage, props` | EnemyController, SlowService, FloatingTextService |
| `EnemyDied` | `enemyId, reward, worldX, worldZ` | FloatingTextService, ResourceService |
| `EnemyReachedEnd` | `enemyId` | GameManager |
| `TowerSelected` | `col, row, defId, tier, choices` | TowerUpgradeMenuHud |
| `TowerDeselected` | — | TowerUpgradeMenuHud |
| `TowerSold` | `col, row, refund` | TowerService |
| `TowerUpgraded` | `col, row, tier, choice` | TowerService |
| `GameOver` | `won: boolean` | GameOverScreenHud |
| `RestartGame` | — | GameManager, all services with state |
| `ActivateFloatingText` | `text, worldX, worldZ, colorR, colorG, colorB` | FloatingTextController |
