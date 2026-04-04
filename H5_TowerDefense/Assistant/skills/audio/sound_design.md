---
name: sound-design
summary: Audio not yet implemented in H5 TowerDefense. Documents planned sound events and MHS audio API entry points for future implementation.
include: as_needed
---

# Audio

## Status

**Not yet implemented.** No audio system exists in the project.

## Planned Sound Events

When audio is added, these are the natural trigger points:

| Event | Sound | Trigger |
|-------|-------|---------|
| Tower fires | Shoot SFX (per tower type) | `TowerController` — after projectile spawn |
| Projectile hits | Impact SFX | `ProjectileController._detonate()` |
| Enemy dies | Death SFX | `EnemyController._die()` |
| Crit | Crit SFX | `FloatingTextService.onTakeDamage` (when `critHit` in props) |
| Wave start | Wave fanfare | `WaveService` — on `WaveStarted` event |
| Wave clear | Clear jingle | `WaveService` — on `WaveCompleted` event |
| Game over / Victory | End music | `GameOverScreenHud` — on `GameOver` event |
| Tower placed | Place SFX | `TowerService._tryPlace()` |
| Tower sold | Sell SFX | `TowerService` — on `TowerSold` event |

## Implementation Notes

- Audio service should be a `@service()` subscribing to existing events — no changes to existing files
- Use `ExecuteOn.Owner` on all audio subscribers
- All audio should be `LocalOnly` (single-player game)
- Check MHS SDK for `AudioComponent` / `AudioService` API at: `C:\Program Files\Meta Horizon Studio STC\v1\asset_hub\sdk_packages\meta\worlds_sdk\index.d.ts`
