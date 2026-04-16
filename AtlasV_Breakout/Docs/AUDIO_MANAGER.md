# Audio Manager

## Overview

The `AudioManager` is a centralized `@service()` singleton that listens to gameplay events and triggers the corresponding sound effects. It does **not** hold audio assets directly — instead, scene entities carry `SoundComponent` + `AudioSource` pairs, and `AudioSource` registers them with the manager at startup.

---

## Architecture

```
Scene Entity (e.g. "SFX_PaddleHit")
  ├── SoundComponent  (asset assigned, autoStart = false)
  └── AudioSource     (soundId = "sfx_paddle_hit")
        └── calls AudioManager.register(soundId, entity) on start
```

`AudioManager` stores a `Map<string, SoundComponent[]>` — multiple instances of the same `soundId` are pooled and played round-robin to avoid clipping on rapid-fire sounds.

---

## Sound IDs (SFX constants)

All IDs are exported from `Scripts/Services/AudioManager.ts` as the `SFX` object.

### Ball
| ID | Trigger Event | Notes |
|---|---|---|
| `sfx_paddle_hit` | `Events.PaddleHit` | Pitch varies with ball vertical speed (0.9–1.3) |
| `sfx_ball_launch` | `Events.ReleaseBall` | — |
| `sfx_ball_lost` | `Events.BallLost` | — |

### Bricks
| ID | Trigger Event | Notes |
|---|---|---|
| `sfx_brick_hit` | `Events.BrickHit` | Volume 0.7 |
| `sfx_brick_destroyed` | `Events.BrickDestroyed` | Random pitch 0.85–1.15 |
| `sfx_explosion_chain` | `Events.ExplosionChain` | Volume & pitch scale with chain size |

### Power-Ups
| ID | Trigger Event | Notes |
|---|---|---|
| `sfx_powerup_collected` | `Events.PowerUpCollected` | — |
| `sfx_sticky_activated` | `Events.StickyPaddleActivated` | — |
| `sfx_sticky_deactivated` | `Events.StickyPaddleDeactivated` | — |

### Coins
| ID | Trigger Event | Notes |
|---|---|---|
| `sfx_coin_collected` | `Events.CoinCollected` | Volume 0.6 |

### Combos (contextual — fires at threshold)
| ID | Threshold | Notes |
|---|---|---|
| `sfx_combo_2` | combo >= 2 | Volume 0.8 |
| `sfx_combo_5` | combo >= 5 | — |
| `sfx_combo_10` | combo >= 10 | — |
| `sfx_combo_15` | combo >= 15 | — |

### Heat Milestones (fires once at exact heat value)
| ID | Heat Level |
|---|---|
| `sfx_heat_5` | 5 |
| `sfx_heat_10` | 10 |
| `sfx_heat_20` | 20 |

### Game State
| ID | Trigger Event | Notes |
|---|---|---|
| `music` | Auto-starts on register; resumes on game over | Looping, fade in/out |
| `sfx_level_start` | `Events.LoadLevel` | Also stops music (fade 1s) |
| `sfx_level_cleared` | `Events.LevelCleared` | — |
| `sfx_game_over` | `HighScoreHUDEvents.ShowHighScores` | Also restarts music |
| `sfx_restart` | `Events.Restart` | — |
| `sfx_message_show` | `HUDEvents.ShowMessage` | Volume 0.5 |

---

## Adding a New Sound

1. **Create a scene entity** in the editor with a `SoundComponent` (assign the audio asset, set `autoStart = false`)
2. **Attach an `AudioSource` component** and set `soundId` to your chosen string constant
3. **Add the constant** to the `SFX` object in `AudioManager.ts`
4. **Add a subscriber** in `AudioManager` for the gameplay event that should trigger it
5. Call `this.playSound(SFX.YOUR_NEW_SOUND)` with optional `volume` and `pitch` parameters

---

## Music System

Background music uses the same registration path but plays with `loop = true` and fade transitions:
- `playMusic(soundId, fadeIn)` — starts looping with fade-in
- `stopMusic(soundId, fadeOut)` — stops with fade-out

Current behavior:
- Music auto-starts when registered (on world load)
- Stops on `LoadLevel` (fade 1s) — gameplay is music-free
- Resumes on game over / high score display (fade 1s)

---

## Audio Assets in Assets.ts

Template-based audio assets are registered in `Scripts/Assets.ts`:

```typescript
export const Audio = {
  COIN_COLLECTED: new TemplateAsset('@Templates/Audio/collect_7.hstf'),
}
```

These are used for spawned audio entities (e.g. coin collect sound), distinct from scene-placed `SoundComponent` entities.
