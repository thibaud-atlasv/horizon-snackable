---
name: sound-design
summary: How to add or modify sound effects in the AudioManager event-driven system
include: always
---

# Sound Design

## System Overview

The `AudioManager` service routes gameplay events to `SoundComponent` entities. Each sound is registered via an `AudioSource` component with a `soundId` matching an `SFX` constant.

## Adding a New Sound Effect

1. **Add the SFX constant** in `Services/AudioManager.ts`:
   ```typescript
   export const SFX = {
     // ... existing sounds ...
     MY_NEW_SOUND: 'MyNewSound',
   } as const;
   ```

2. **Create a scene entity** in MHS with:
   - A `SoundComponent` with the audio asset assigned, `autoStart = false`
   - An `AudioSource` component with `soundId = 'MyNewSound'`

3. **Trigger it** in `AudioManager` by subscribing to the appropriate event:
   ```typescript
   @subscribe(SomeEvent)
   onSomeEvent(p: SomePayload): void {
     this._play(SFX.MY_NEW_SOUND);
   }
   ```

## Playback API

The `AudioManager._play()` method accepts:
- `soundId` — which sound pool to pick from
- `volume` — playback volume (default 1.0)
- `pitch` — playback pitch (default 1.0)

Multiple entities with the same `soundId` form a round-robin pool for polyphony.

## Current Sound Map

See `Docs/AUDIO_MANAGER.md` for the complete list of sound IDs and their triggers.

## Guidelines

- Keep sounds short and punchy for a snackable game feel
- Layer sounds for impact (e.g. Goal plays both `sfx_goal` + `sfx_win`)
- Combo sounds use lower volume (0.2) to not overwhelm
- Use distinct sounds for each outcome so the player gets audio feedback without looking
