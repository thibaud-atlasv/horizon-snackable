# World Overview Report

## Summary

A **mobile-first portrait Breakout** built for Meta Horizon Worlds. Features a touch-controlled paddle, physics ball with substepped AABB collisions, a pooled brick grid, combo + heat power scaling, coin vacuum scoring, and a full juice layer (hit freeze, camera shake, particles, animations).

---

## Scene Structure (space.hstf)

### Main Entities
- **SpawnPoint** — Position: (0, -100, -2)
- **ClientSetup** — Camera initialization + focused interaction mode
- **Background** — Background color target (ColorComponent driven by level palette)
- **Paddle** — Position: (0, -7, 0) — horizontal bar, child Cube mesh
- **Ball** — Position: (0, -6.5, 0) — child Sphere mesh
- **Manager** — Hosts `GameManager`, `LevelLayout`, `ComboManager`, `LeaderboardManager`

---

## Game Systems

### GameManager
**File:** `Scripts/Components/GameManager.ts`

- Tracks lives (`maxLives` property, default 1)
- On `BallLost`: decrements lives → game over (leaderboard) or reset round
- On `BrickDestroyed`: checks victory condition
- On `LevelCleared`: activates super vacuum, waits for all coins, then advances
- On tap: starts game from title screen or dismisses high scores
- Level progression: cycles through all 11 levels infinitely; stays on current level on death

---

### Paddle
**File:** `Scripts/Components/Paddle.ts`

- Touch-raycasting target position, lerped per frame (`paddleLerpFactor`, default 0.88)
- Clamped within `BOUNDS` using base scale (not squash scale)
- Squash & stretch: impact squash on ball hit + movement stretch proportional to speed
- Generic power-up effects via `PaddleEffects.ts` factory; effects have independent timers
- Color: set by level palette; white flash on ball contact (50ms)

---

### Ball
**File:** `Scripts/Components/Ball.ts`

- Base speed: 8.5 units/s, scaled by `BallPowerService.speedMultiplier`
- 8-substep physics per frame to prevent tunneling
- Wall bounce (left/right/top), paddle bounce (angle from hit position, ±60°), brick bounce (axis determined by penetration depth)
- Sticky mode: sticks to paddle, released on tap (`StickyBallState.ts`)
- Pierce: at high heat, passes through bricks without bouncing (consumes heat)
- Fires `PaddleHit`, `BrickHit`, `BrickDestroyed`, `BallLost`

---

### Brick
**File:** `Scripts/Components/Brick.ts`

- Pool-based (106 entities pre-warmed by `LevelLayout`)
- HP, color-by-HP, indestructible flag — initialized via `Events.InitBrick`
- 4 reveal animation styles: Pop, DropIn, Spin, Stretch
- Death animation: scale-down + z-rotation (0.15s, 12 rad/s)
- Title idle animation: scale + brightness pulse (per-brick random phase)
- Collision disabled during reveal; re-registered when animation completes
- Fires `BrickRecycle` when parked — pool reclaims the entity

---

### ExplosiveBrick
**File:** `Scripts/Components/ExplosiveBrick.ts`

- Extends `Brick`; on destruction queries neighbors within radius and calls `triggerDestruction()` on each `IBrick`
- Loop guard prevents infinite chain recursion
- Fires `Events.ExplosionChain` with chain size for scaled juice

---

### LevelLayout
**File:** `Scripts/Components/LevelLayout.ts`

- Pre-warms 106 brick entities at start; parks them at (0, -100, 0)
- On `LoadLevel`: parks all active bricks, spawns new layout after 200ms delay
- Layout driven by ASCII grid in `LevelConfig`; per-cell char maps to `BrickTemplate`
- Random reveal style + random stagger pattern chosen per level transition (4 styles × 5 patterns)
- Background color applied from level palette

---

### CollisionManager
**File:** `Scripts/CollisionManager.ts`

- Lazy singleton; AABB `register`/`unregister`/`query`
- Ball drives collision detection via `checkAgainst(this)` each substep
- Stationary bricks don't self-check — ball finds them

---

## Coin & Scoring

### CoinService
**File:** `Scripts/Services/CoinService.ts`

- 1–3 coins per destroyed brick (virtual particles rendered via VfxService pool)
- Shmup-style vacuum: direct radial pull within 3.5-unit radius; tangential velocity killed aggressively (no orbiting)
- Super vacuum on level clear: full-screen pull until all coins collected
- Instant collection at `COLLECT_RADIUS` (0.5 units): fires `CoinCollected` + golden burst

### BallPowerService
**File:** `Scripts/Services/BallPowerService.ts`

- Heat = bricks destroyed since last life lost (survives paddle hits)
- Speed: logarithmic curve, capped at 2.0× base speed
- Pierce thresholds: heat ≥ 5 → 1 pierce, ≥ 10 → 2, ≥ 20 → 3
- Pierce is consumable: each brick pierced costs 2 heat points (self-limiting)

### ComboManager
**File:** `Scripts/Components/ComboManager.ts`

- Combo: resets on paddle hit or ball lost
- Heat: resets only on ball lost / restart
- Drives `ComboHUDViewModel` and `BallPowerService` via events

### LeaderboardManager
**File:** `Scripts/Components/LeaderboardManager.ts`

- Server: pre-fetches leaderboard on player join; re-fetches after score submission
- Broadcasts via `LeaderboardEntriesFetched` (NetworkEvent) to all clients
- Client: caches received entries; displays on `LeaderboardDisplayRequest`
- Fallback: if cache empty, fetches player's own entry client-side
- Leaderboard name: `"score"`, 10 entries centered around current player rank

---

## Juice Layer

### JuiceService
**File:** `Scripts/Services/JuiceService.ts`

| Event | Freeze | Shake |
|---|---|---|
| BrickHit | 20ms | intensity 0.04, 80ms |
| BrickDestroyed | 40ms | intensity 0.08, 150ms |
| PaddleHit | — | intensity 0.03, 60ms |
| ExplosionChain | 50–100ms (chain-scaled) | intensity 0.25×scale, 350ms |
| BallLost | 60ms | intensity 0.20, 350ms |

### VfxService
**File:** `Scripts/Services/VfxService.ts`

- 170 general particles + 30 trail particles (separate circular pools, pre-warmed by GameManager)
- General pool: impact bursts (3 per hit), paddle sparks (4 per hit), coin collect burst (3 per collect)
- Trail pool: circular write, fade by age — ball motion trail
- Flash system: white color override with timer-based restore

### CameraShakeService
**File:** `Scripts/Services/CameraShakeService.ts`

- Decaying amplitude shake; offset applied to camera transform each frame

---

## HUD & UI

| Component | Description |
|---|---|
| `GameHUDViewModel` | Score (casino roll-up + scale punch + glow), lives hearts, center text (DVD-bounce "Tap to start") with squash/color cycling |
| `ComboHUDViewModel` | Combo counter — pop-in/grow/fade; color tiers cyan→pink→magenta→gold at 2/5/10/15 |
| `BackgroundAnimViewModel` | Dynamic hue-cycling overlay, pulses on brick destroy; top-concentrated gradient |
| `HighScoreHUDViewModel` | Leaderboard table on game over — staggered slide-in, gold/silver/bronze ranks, current player highlighted |

---

## Power-Up System (built, disabled in level configs)

| Component | Description |
|---|---|
| `PowerUpManager` | Spawn pool + per-level chance/type selection |
| `PowerUp` | Falling pickup; collected on paddle overlap |
| `PaddleEffects` | `BigPaddle` (scale), `StickyPaddle` (sticky state) |
| `StickyBallState` | Ball attachment state machine |

---

## Constants (`Scripts/Constants.ts`)

```
BOUNDS: { x: -4.5, y: -8, w: 9, h: 16 }
BALL_SPEED_BASE: 8.5
BRICK_POOL_SIZE: 106
PARTICLE_POOL_SIZE: 170
TRAIL_POOL_SIZE: 30
```

---

## Event System (`Scripts/Types.ts`)

All cross-component communication uses typed local or network events. Key namespaces:

| Namespace | Purpose |
|---|---|
| `Events` | Core gameplay (BallLost, BrickDestroyed, LoadLevel, ResetRound, etc.) |
| `HUDEvents` | Score, lives, center text |
| `ComboHUDEvents` | Combo increment/reset |
| `HeatEvents` | Heat increment/reset (drives BallPowerService) |
| `HighScoreHUDEvents` | Show/hide leaderboard overlay |
| `LeaderboardEvents` | Score submission (NetworkEvent) and entries fetch (NetworkEvent) |
| `BackgroundEvents` | Background pulse trigger |
