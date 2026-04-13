# Project Summary

## Vision

A **mobile-first, portrait-mode breakout** built for Meta Horizon Worlds that feels like a **dopamine slot machine**. Every tap, every hit, every coin collected feeds a tight reward loop. The game should feel closer to Vampire Survivors or Smash Hit than classic Arkanoid — constant feedback, escalating power, and a screen that never stops reacting.

### Session Format
- Duration: **20 seconds – 7 minutes** (sweet spot: 1–2 minutes)
- Input: **1 finger** (tap, swipe, hold-release)
- **One core action**: move the paddle
- Solo, 2D, portrait

### The 3 S Criteria
| S | Check |
|---|---|
| **SHORT** | A session ends in under 2 minutes — but the player *wants* to go again |
| **SATISFYING** | Every brick hit pops, every coin vacuumed feels earned, every level-up feels powerful |
| **SIMPLE** | No tutorial — the paddle moves, coins fall, power grows. Obvious in 3 seconds |

---

## Design Philosophy

### Core Feeling: "Everything I do has impact"

The player should never be passive. The paddle is not just a bouncing surface — it's a **coin magnet**, an **escalation engine**. The screen is always alive: particles, shakes, flashes, coins raining. Silence and stillness are bugs.

### Principles

- **Constant reward rain.** Every brick destroyed drops coins. The paddle vacuums them in. Score climbs. The loop never pauses.
- **Escalating power fantasy.** Ball speed increases with each brick destroyed (`ballSpeedIncrementPerBrick`). Combo system and piercing reward aggressive play.
- **Maximum feedback, minimum complexity.** One input, one goal, but the screen explodes with juice on every interaction. Hit freeze, screen shake, particles, floating numbers — layered to create weight and impact.
- **Every system serves the loop.** If it doesn't make the player feel powerful or feed the reward cycle, it doesn't ship.
- **Arcade endurance.** On death the player restarts the current level (score resets to 0) — no going back to level 1. Levels cycle infinitely, rewarding long runs.

---

## Core Reward Loop

```
Brick destroyed
  → 1-3 Coins spawn (spread + gravity)
  → Paddle vacuum pulls coins in (tight radius — player must chase them)
  → Score increases + combo multiplier builds
  → Ball accelerates with each brick destroyed
  → Bricks die faster → More coins → Loop accelerates
```

### Ball Power Scaling
| Mechanic | Effect |
|---|---|
| `ballSpeedIncrementPerBrick` | Ball speeds up with every brick destroyed — escalating intensity |
| Combo system | Consecutive hits build a combo counter with visual escalation |
| Piercing | At high combo, ball tears through bricks without bouncing |

---

## Level Design

### Philosophy
- **11 levels** (0–10), cycling infinitely
- All 1HP bricks, no power-ups — pure arcade feel
- **80s neon / rainbow / arcade aesthetic** — intense saturated colors on dark backgrounds
- Same physics across all levels: `ballSpeedMultiplier: 1`, `paddleLerpFactor: 0.88`, `ballSpeedIncrementPerBrick: 0.2`
- Visual variety comes from **grid patterns** and **color palettes**, not mechanics

### Level Overview
| # | Name | Pattern | Colors |
|---|---|---|---|
| 0 | Arcade | 6 horizontal rainbow rows | Full rainbow (pink → violet) |
| 1 | Diamond | Concentric diamond shape | Red → cyan gradient rings |
| 2 | Checkerboard | Alternating gaps | Hot pink + cyan |
| 3 | Invader | Space Invader silhouette | Neon green |
| 4 | Zigzag | Offset horizontal bands | Full rainbow |
| 5 | Heart | Heart shape | Pink / rose / magenta |
| 6 | Pyramid | Inverted pyramid, rainbow layers | Full rainbow spectrum |
| 7 | Columns | Vertical rainbow columns | 5 rainbow colors |
| 8 | Cross | + cross shape | Gold / white / cyan |
| 9 | Diagonal Stripes | Repeating diagonal rainbow | Full rainbow |
| 10 | Rings | Concentric rectangles | Pink outer, yellow mid, blue center |

### Brick Reveal Animation
Each level transition plays a **randomized reveal animation** — bricks don't just appear, they pop in with juice:
- **4 animation styles** (random per level): Pop (bounce overshoot), DropIn (fall + bounce), Spin (360° rotation), Stretch (rubber band snap)
- **5 stagger patterns** (random per level): Diagonal wave, Spiral from center, Row-by-row, Random scatter, Column sweep
- Collisions disabled during reveal — ball can't hit invisible bricks

---

## Current Systems

### Core
| Script | Role |
|---|---|
| `Ball.ts` | Ball movement, wall bounce, collision response, substepped physics |
| `Paddle.ts` | Touch-controlled paddle, smooth lerp movement |
| `Brick.ts` | Multi-hit bricks with color-coded HP, hit flash, reveal animation, death animation |
| `ExplosiveBrick.ts` | Chain reaction — destroys adjacent bricks on death |
| `CollisionManager.ts` | AABB collision for all `ICollider` entities |
| `GameManager.ts` | Lives, score, round reset, level progression (stays on current level on death), victory conditions |
| `LevelLayout.ts` | Spawns bricks from ASCII grid patterns with randomized reveal animations |
| `LevelConfig.ts` | 11 levels with per-level grid, colors, physics, and palette |

### Coin & Scoring
| Script | Role |
|---|---|
| `CoinService.ts` | Coin pool, spawn from destroyed bricks, vacuum toward paddle (radius: 3.5), collection scoring |
| `BallPowerService.ts` | Ball power scaling and piercing mechanics |
| `ComboManager.ts` | Combo counter — consecutive hits without dropping |
| `LeaderboardManager.ts` | Submits scores to "score" leaderboard on game over; server pre-fetches entries on player join and after submission, broadcasts to clients via NetworkEvent; client caches entries and displays on game over with fetchEntryForPlayer as fallback |

### Juice Systems
| Script | Role |
|---|---|
| `JuiceService.ts` | Centralized impact effects — hit freeze, camera shake, particles per event type |
| `VfxService.ts` | Particle pool (200 entities) — brick explosions, ball trail, hit sparks, coin collect burst |
| `CameraShakeService.ts` | Screen shake on impacts (variable intensity per event type) |

### HUD & UI
| Script | Role |
|---|---|
| `GameHUDViewModel.ts` | Score (casino-style roll-up + scale punch + glow), lives hearts, center text (DVD-bounce "Tap to Start") |
| `ComboHUDViewModel.ts` | Combo counter overlay — pop-in/grow/fade, neon color tiers (cyan → pink → magenta → gold), 6x overflow scale |
| `BackgroundAnimViewModel.ts` | Dynamic background — hue-cycling overlay, pulses brick's actual color on destroy, top-concentrated gradient, idle decay |
| `HighScoreHUDViewModel.ts` | High score table overlay — dynamic ItemsControl list with staggered slide-in animation (right to left), gold/silver/bronze rank colors, current player row highlighted with gold background glow and white text, fixed rank column width, 240px bottom margin, shown on game over for 5 seconds before auto-restart |

### Power-Ups (built, currently disabled in level configs)
| Script | Role |
|---|---|
| `PowerUpManager.ts` | Power-up pool and spawn logic per level |
| `PowerUp.ts` | Power-up pickup spawning and collection |
| `PaddleEffects.ts` | Paddle visual effects (size squash, color tint) |
| `StickyBallState.ts` | Sticky paddle ball attachment logic |

---

## Juice Targets

Every interaction must have **layered feedback**. The checklist:

### Hit & Destroy
- [x] **Hit freeze**: 20ms on hit, 40ms on destroy, 100ms on chain explosions
- [x] **Camera shake**: light on hit, medium on destroy, heavy on ball lost
- [x] **Brick death animation**: rapid scale-down + rotation (0.15s shrink + 12 rad/s spin)
- [x] **Hit particles**: sparks on non-lethal hit, explosion burst on destroy
- [x] **Brick reveal animation**: randomized pop/drop/spin/stretch with staggered delay patterns
- [ ] **Floating score text**: pops from destroyed brick position *(user-built)*

### Paddle & Ball
- [x] **Paddle squash & stretch**: compress on impact, stretch during fast movement
- [x] **Paddle hit sparks**: directional particles at impact point
- [ ] **Ball stretch**: elongates in movement direction proportional to speed
- [ ] **Vacuum visual**: subtle pull lines / glow around paddle when coins are nearby

### Coins & Scoring
- [x] **Coin spawn spread**: 1-3 coins per brick, slight random scatter
- [x] **Coin vacuum**: magnetic pull toward paddle within tight radius (3.5 units — player must chase)
- [x] **Collection burst**: particle + flash on coin pickup
- [x] **Casino score roll-up**: animated counting with scale punch and golden glow
- [x] **Combo system**: neon-colored combo counter with cinematic scale (6x overflow)

### Ambiance
- [x] **Background color animation**: dynamic hue-cycling overlay, pulses destroyed brick color, top-concentrated gradient
- [x] **Background intensity API**: auto-triggers on brick destroy, explosions, combos, ball lost
- [x] **Color palette escalation**: each level uses distinct intense neon palettes (80s arcade aesthetic)
- [x] **Level intro animation**: randomized brick reveal with 4 styles × 5 patterns
- [x] **Background music**: looping arcade synthwave music — starts on level load, fades out on game over, restarts on retry
- [ ] **Background particles**: slow ambient drift to prevent static feel
- [ ] **Trail intensity scaling**: ball trail grows with combo/power level

---

## Victory & Progression

### Victory Conditions
| Type | Description |
|---|---|
| **Destroy All** | Clear every destructible brick (current default for all levels) |
| **Destroy N** | Hit a target brick count (partial clear) |
| **Survive** | Stay alive for X seconds |

### Death & Restart
- On death: **high score table displays** real leaderboard data (pre-fetched on player join, updated after score submission); if server data unavailable, falls back to player's own leaderboard entry via client-side fetch; current player row highlighted in gold
- Player score is submitted to the "score" leaderboard on game over
- Tap to dismiss and restart current level with score reset to 0
- Player never goes back to level 0 — preserves progression feeling
- Levels cycle infinitely after level 10 (wraps to level 0)

---

## Play Area

- Bounds: X in [-4.5, +4.5], Y in [-8, +8]
- Paddle at Y = -7
- Ball spawns at Y = -6.5

## Templates

- `Breakout.hstf` — main scene
- `Templates/GameplayObjects/Brick.hstf` — brick prefab
- `Templates/GameplayObjects/ExplosiveBrick.hstf` — explosive brick prefab
- `Templates/GameplayObjects/BigPaddle.hstf` — big paddle power-up pickup
- `Templates/GameplayObjects/StickyPaddle.hstf` — sticky paddle power-up pickup
- `Templates/Particle.hstf` — particle entity
