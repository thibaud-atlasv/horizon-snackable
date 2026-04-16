---
name: sound-design
summary: How to add, register, and trigger sound effects and music via the AudioManager service
include: on-demand
---

# Sound Design Guide

All audio in the project is routed through the `AudioManager` service (`Scripts/Services/AudioManager.ts`). Sounds are not played directly by gameplay code — instead, gameplay events trigger playback automatically.

---

## Architecture

```
Scene Entity ("SFX_MySound")
  ├── SoundComponent   (audio asset assigned, autoStart = false)
  └── AudioSource      (soundId = "sfx_my_sound")
        └── calls AudioManager.register(soundId, entity)
```

`AudioManager` stores a `Map<string, SoundComponent[]>` — multiple instances of the same ID are pooled and played **round-robin** to prevent clipping on rapid-fire sounds.

---

## Adding a New Sound Effect

### Step 1 — Add the SFX constant

Add a new entry to the `SFX` object in `AudioManager.ts`:

```typescript
export const SFX = {
  // ...existing entries...
  MY_NEW_SOUND: 'sfx_my_new_sound',
} as const;
```

### Step 2 — Create a scene entity

In the Horizon editor:
1. Create a new entity (e.g. "SFX_MyNewSound")
2. Add a `SoundComponent` — assign the `.wav` / `.mp3` audio asset, set `autoStart = false`
3. Add an `AudioSource` component — set `soundId` to `"sfx_my_new_sound"` (must match the constant)

For rapid-fire sounds (e.g. coin collect, brick hit), create **multiple entities** with the same `soundId` — they will be pooled automatically.

### Step 3 — Subscribe to a gameplay event

In `AudioManager.ts`, add an event subscriber:

```typescript
@subscribe(Events.MyNewEvent)
onMyNewEvent(p: Events.MyNewEventPayload): void {
  this.playSound(SFX.MY_NEW_SOUND);
}
```

### Step 4 — (Optional) Dynamic pitch and volume

`playSound(soundId, volume?, pitch?)` accepts optional volume and pitch:

```typescript
// Pitch varies with speed
const pitch = Math.min(0.9 + Math.abs(p.speed) * 0.02, 1.3);
this.playSound(SFX.MY_NEW_SOUND, 1.0, pitch);

// Quieter for background events
this.playSound(SFX.MY_NEW_SOUND, 0.5);
```

---

## Music

Music uses `playMusic(soundId, fadeIn)` and `stopMusic(soundId, fadeOut)`:

```typescript
this.playMusic(SFX.MUSIC, 1);   // loop with 1s fade-in
this.stopMusic(SFX.MUSIC, 1);   // stop with 1s fade-out
```

Music auto-starts when the `"music"` sound ID is registered. Current behavior:
- Stops on `LoadLevel` (fade 1s) — gameplay has no music
- Resumes on game over / high score display (fade 1s)

---

## Template-Based Audio Assets

For audio that must be spawned dynamically (not placed in the scene), register it in `Assets.ts`:

```typescript
export const Audio = {
  COIN_COLLECTED: new TemplateAsset('@Templates/Audio/collect_7.hstf'),
}
```

---

## Existing Sound IDs Reference

| Category | IDs | Notes |
|---|---|---|
| Ball | `sfx_paddle_hit`, `sfx_ball_launch`, `sfx_ball_lost` | Paddle hit has dynamic pitch |
| Bricks | `sfx_brick_hit`, `sfx_brick_destroyed`, `sfx_explosion_chain` | Destroy has random pitch; explosion scales with chain |
| Power-ups | `sfx_powerup_collected`, `sfx_sticky_activated`, `sfx_sticky_deactivated` | — |
| Coins | `sfx_coin_collected` | Volume 0.6 |
| Combos | `sfx_combo_2`, `sfx_combo_5`, `sfx_combo_10`, `sfx_combo_15` | Fires at combo threshold |
| Heat | `sfx_heat_5`, `sfx_heat_10`, `sfx_heat_20` | Fires once at exact heat value |
| Game state | `music`, `sfx_level_start`, `sfx_level_cleared`, `sfx_game_over`, `sfx_restart`, `sfx_message_show` | Music loops; others are one-shot |

---

## Checklist

- [ ] SFX constant added to the `SFX` object in `AudioManager.ts`
- [ ] Scene entity created with `SoundComponent` + `AudioSource` (soundId matches constant)
- [ ] Event subscriber added in `AudioManager.ts`
- [ ] Multiple entities created for rapid-fire sounds (round-robin pooling)
- [ ] Volume and pitch tuned for feel
