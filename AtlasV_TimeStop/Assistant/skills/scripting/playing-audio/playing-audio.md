---
name: playing-audio
summary: Plays sounds and music via AudioManager. Use when implementing audio playback, sound effects, background music, or looping ambient sounds.
include: as_needed
---

# Project-Specific Rules (H2_Timestop)

> - Audio is **not yet implemented** in this project. This skill describes the setup needed to add it.
> - This game is **client-only** — all audio playback must run in client context only. Always guard with `isServerContext()`.
> - Use `NetworkMode.LocalOnly` when spawning the `AudioInstance` template.
> - Recommended event hooks for sounds:
>   - Freeze sound → subscribe to `Events.FallingObjFrozen` (payload has `grade` and `lowestY`)
>   - Floor hit → subscribe to `Events.FallingObjHitFloor`
>   - Grade fanfare → subscribe to `HUDEvents.ShowGrade`
>   - Tap → subscribe to `Events.PlayerTap`
>   - Game over / victory → subscribe to `Events.PhaseChanged` and check `p.phase`

---

# Setup
### Step 1: Copy Script File

>  You **MUST** use `copy_local_file` to copy this file. Do NOT attempt to create files from scratch or use any other method.

| Source | Destination |
|--------|-------------|
| `Assistant/skills/scripting/playing-audio/AudioManager.ts.skill` | `scripts/Audio/AudioManager.ts` |

### Step 2: Wait for Asset Build

```text
wait_for_asset_build: scripts/Audio/AudioManager.ts
```

### Step 3: Add Entity to scene

> You **MUST** ensure an `AudioManager` component is on an entity in the main scene. This is required for audio playback.

- Call `find_entity` to determine if an AudioManager exists in the scene
- If it doesn't exist, call `create_entity` to make an entity called `AudioManager` in the scene
- Call `add_component_to_entity` to add the `AudioManager` component to the entity
- Create a new template called `AudioInstance` that contains a single entity called `AudioInstance` and has the `horizon::platform_api::SoundPlatformComponent` attached. IMPORTANT: DO NOT USE class=Sound as this doesn't work, YOU MUST use the full component name `horizon::platform_api::SoundPlatformComponent`. DO NOT ADD ANY OTHER ENTITIES OR COMPONENTS.
- Set the `AudioInstance` template to the AudioManager `soundSourceTemplate` property

# Playing Audio

- Client-side only—server code must send events to clients for playback
- ALWAYS use `AudioManager.ts` included with this skill
- Do not use `AudioManager` in server code

## Imports

```typescript
import type { SoundAsset } from 'meta/worlds';
import {
  playSoundAtPosition,
  playSound2D,
  playMusic,
  stopMusic,
  setMusicVolume,
  getMusicVolume,
  playLoopingSound,
  updateLoopingSoundPosition,
  stopLoopingSound,
  stopAllLoopingSounds
} from './AudioManager';
```

## SoundAsset

```typescript
// Preferred: Editor-configurable property (default to null)
@property() impactSound: Maybe<SoundAsset> = null;

// Rarely used: Declared in code
export const clickSound: SoundAsset = new SoundAsset("meta/core_ui_module@sounds/click3.ogg:sound");
```

## One-Shot Sounds

| Function | Use For |
|----------|---------|
| `playSoundAtPosition(sound, position, config?)` | Impacts, explosions, footsteps |
| `playSound2D(sound, config?)` | UI clicks, menu sounds, notifications |

```typescript
playSoundAtPosition(hitSound, enemy.worldPosition);
playSoundAtPosition(explosionSound, pos, { playVolume: 0.8, minMaxPitch: new Vec2(0.9, 1.1) });
playSound2D(buttonClickSound);
```

## Music

```typescript
playMusic(battleTheme, { volume: 0.5 });
stopMusic();
setMusicVolume(0.3);
const vol = await getMusicVolume();
```

## Looping Sounds

For ambient sounds with stop/move control. Requires `await` to get ID.

```typescript
const fireId = await playLoopingSound(fireSound, firePosition, { playVolume: 0.7 });
updateLoopingSoundPosition(fireId, newPosition);
stopLoopingSound(fireId);
stopAllLoopingSounds();
```

## Config Reference

| Config | Options |
|--------|---------|
| **SoundPlayConfig** | `playVolume` (0–1), `minMaxPitch` (Vec2), `minMaxDistance` (Vec2), `reverbSendLevel` (0–1) |
| **LoopingPlayConfig** | `playVolume` (0–1), `minMaxDistance` (Vec2), `reverbSendLevel` (0–1) |
| **MusicPlayConfig** | `volume` (0–1) |

## Audio Generation Notes

Request **ambient** for music/long-duration environmental sounds (>10s). Request **sfx** for action-triggered sounds. Always specify duration type when generating audio.
