# Project Summary

## Design Goals

This project is a **mobile-first, portrait-mode breakout game** built for Meta Horizon Worlds.

### Session Format
- Duration: **20 seconds – 7 minutes** (target: 1–2 minutes)
- Input: **1 finger** (tap, swipe, hold-release)
- **One core action**: move the paddle
- Solo, 2D

### The 3 S Criteria
| S | Check |
|---|---|
| **SHORT** | A session can end in under 2 minutes |
| **SATISFYING** | Player is rewarded frequently; generous feedback on every hit, catch, and destruction |
| **SIMPLE** | No tutorial needed — mechanics are obvious at first glance |

---

## Design Philosophy

The core goal is to build a **generic, extensible breakout** that can be remixed by the AI or the user on as many axes as possible: difficulty, theme, level layouts, power-ups, enemies, win conditions, UI, etc.

### Principles

- **The core makes no assumptions about the modules.** Ball, Paddle, Bricks, and the collision system work standalone. Nothing in the core knows about power-ups, enemies, or scoring.
- **Modules enrich the core via events.** A `PowerUpManager` listens to `BrickDestroyed` and spawns pickups. A future `EnemyManager` could move bricks or react to `BallLost`. New systems plug in without touching existing code.
- **Every system is independently replaceable.** Swap the level layout, the win condition, the visual theme — none of these require changes to Ball or Paddle.
- **Tunable from the inspector.** Speed, chance, duration, grid pattern, colors — everything a designer or the AI would want to tweak is exposed as `@property`.

---

## Current Systems

### Core
| Script | Role |
|---|---|
| `Ball.ts` | Ball movement, wall bounce, collision response |
| `Paddle.ts` | Touch-controlled paddle movement |
| `Brick.ts` | Destroyed on ball contact, emits `BrickDestroyed` |
| `CollisionManager.ts` | Generic AABB collision, works with any `ICollider` |
| `GameManager.ts` | Lives, `BallLost` → restart logic, win condition |
| `LevelLayout.ts` | Spawns bricks from a configurable grid string pattern |

### Power-Up Module *(optional, decoupled)*
| Script | Role |
|---|---|
| `PowerUpManager.ts` | Listens to `BrickDestroyed`, spawns a power-up with configurable probability |
| `PowerUp.ts` | Falls toward paddle, emits `PowerUpCollected` on catch, auto-cleans on reset |
| `Paddle.ts` | Listens to `PowerUpCollected`, applies visual and gameplay effects |

### HUD Module *(optional, decoupled)*
| Script | Role |
|---|---|
| `GameHUD/Types.ts` | HUD events: `UpdateScore`, `UpdateLevel`, `UpdateLives`, `ShowMessage`, `HideMessage` |
| `GameHUD/GameHUDViewModel.ts` | ViewModel with reactive properties (`score`, `level`, `lives`, `centerText`, `showCenterText`) for UI binding |
| `GameHUD/GameHUD.xaml` | XAML layout: top bar (Score, Level), heart icons for lives in bottom-right corner, center text for game messages |

The HUD entity is in `space.hstf` with:
- `CustomUiComponent` (ScreenSpace mode for mobile)
- `GameHUDViewModel` component for data binding

Available power-ups:
- **BigPaddle** — doubles paddle width for a configurable duration (green gem visual)
- **StickyPaddle** — ball sticks to paddle until player taps again

---

## Extension Points

The following axes are designed to be added or remixed:

- **Levels** — new grid patterns via `LevelLayout.gridPattern`, or a `LevelSequence` module that cycles layouts on win
- **Power-ups** — new `PowerUpType` enum values + new `@subscribe(Events.PowerUpCollected)` handlers in any component
- **Enemies** — components that react to events (e.g. `BrickDestroyed`, `BallLost`) and add new behaviors without touching core
- **Brick variants** — multi-hit bricks, moving bricks, indestructible bricks, explosive bricks — all implementing `ICollider`

### Brick Types
| Type | Behavior |
|---|---|
| `Brick.ts` | Standard brick, configurable hits, optional indestructible mode |
| `ExplosiveBrick.ts` | Red/orange brick that destroys all 8 adjacent bricks when hit; chain reactions with other ExplosiveBricks |
- **Win/lose conditions** — override `GameManager` logic or add a separate `WinConditionManager`
- **Visual themes** — colors, materials, scale all exposed via `@property`
- **Difficulty** — ball speed, spawn chance, paddle speed, power-up duration all tunable in the inspector

---

## Play Area

- Bounds: X ∈ [-4.5, +4.5], Y ∈ [-8, +8]
- Paddle at Y = -7
- Ball spawns at Y = -6.5

## Templates

- `space.hstf` — main scene (paddle, ball, brick layout, game manager, power-up manager)
- `Templates/GameplayObjects/Brick.hstf` — single brick
- `Templates/GameplayObjects/PowerUp.hstf` — power-up pickup
