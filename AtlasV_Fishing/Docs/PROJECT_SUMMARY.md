# AtlasV Fishing — Project Summary

## Concept

Mobile portrait fishing game (9×16 world units) built with Meta Horizon Worlds SDK.
Single player, local-only. Designed to be **snackable** — a satisfying session in under 3 minutes with no explanation needed.

The game is built around 3 S:
- **Simple** — one tap to cast, swipe to steer, automatic everything else
- **Satisfying** — juice at every beat: freeze frames, shake, flash, stretch/squash
- **Short** — one run = cast → dive → surface → catch reveal → reset

## Gameplay Loop

1. **Idle** — Hook hangs from rod at water surface, fish swim at depth.
2. **Throwing** — Tap anywhere → hook launches in a physics arc toward the center of the play area (slight random spread). No player input during flight.
3. **Diving** — Hook enters water and descends automatically. Player swipes horizontally to steer. Fish within range attach to the hook automatically.
4. **Surfacing** — Hook automatically rises at speed, dragging hooked fish up.
5. **Launching** — Fish fly upward in a staggered arc reward animation and exit the screen.
6. **Reset** — Brief pause, then back to Idle.

There is no reel mechanic, no power gauge, no timing challenge. The engagement comes from steering during the dive and the anticipation of what you'll catch.

## Fish Database

18 species across 3 zones. Rarity: common / rare / legendary.

| Zone | Depth (world Y) | Species |
|------|-----------------|---------|
| 1 — Surface   | 4.5 → -8.5  | Clownfish, Koi, Blue Discus, Butterflyfish, Angelfish, Rainbow Fish |
| 2 — Mid-depth | -8.5 → -24.5 | Silver Carp, Green Discus, Dolphin, Flame Angelfish, Sand Flounder, Sea Turtle |
| 3 — Abyss     | -24.5 → -38.5 | Violet Barracuda, Blue Flounder, Reef Shark, Pink Dolphin, Barracuda, Pink Shark |

Fish from all zones swim at depth regardless of unlock state.

## Zone Progression

Zones unlock by catching unique species — no XP, no currency.

| Unlock | Threshold |
|--------|-----------|
| Zone 2 | 3 unique species |
| Zone 3 | 7 unique species |

The hook's max dive depth increases as zones unlock, giving access to deeper fish.

## Architecture

```
ClientSetup           → camera lock, focused interaction, registers camera + flash plane to services
GameManager           → phase state machine (Idle → Throwing → Diving → Surfacing → Launching → Reset)
HookController        → hook physics, line rendering, fish collection, launch reward anim
SimpleFishController  → per-fish swim AI, hooked follow, launch arc (implements IFishInstance)
FishRegistry          → live IFishInstance spatial lookup (findHits)
FishPoolService       → entity pool — activates/benches fish without spawning/destroying
FishSpawnService      → decides when and where to activate fish from the pool
FishDefs              → static data: all 18 species definitions
FishCollectionService → catch journal (unique counts, persisted via PlayerProgressService)
ZoneProgressionService → tracks unlocked zones, bait floor Y
GameCameraService     → vertical scroll following hook during dive + camera shake
VFXService            → centralised juice: shake, flash, freeze frame, haptic stub, stretch/squash
BubblePool            → pool of rising bubble entities attached to fish
FishingHUDViewModel   → main HUD: depth counter during dive, species progress bar, zone unlock notification
GameHUDViewModel      → idle HUD: fish/gold counters, cast button, upgrade buttons; auto-hides during gameplay
CatchDisplayViewModel → post-run catch reveal panel with elastic animations
GoldExplosionViewModel → poolable WorldSpace gold burst effect (spawned when fish convert to gold)
GoldExplosionPool     → pre-spawns pool of GoldExplosion UI entities; on FishCollected, resolves rarity → gold value and plays explosion at fish position
```

## VFX System

All juice flows through `VFXService`:

| Method | Effect |
|--------|--------|
| `shake(dur, amp)` | Camera shake via GameCameraService |
| `flash(dur, r, g, b)` | Full-screen color overlay fade-out |
| `freeze(durationMs)` | Global time-stop (camera exempt) |
| `haptic(intensity)` | Stub — ready for SDK haptic API |
| `stretch(entity, factor, dur)` | Scale Y up / X down then recover |
| `squash(entity, factor, dur)` | Scale Y down / X up then recover |

Built-in trigger: `FishHooked` → freeze 60ms + shake 0.30s + flash 0.18s.

The `isFrozen` flag is checked at the top of `HookController.onUpdate` and `SimpleFishController.onUpdate`. `GameCameraService` is exempt so shake continues during freeze.

## Key Extension Points

| Goal | Where |
|------|-------|
| Add a fish species | One entry in `FishDefs.ts` |
| Add a juice trigger | Subscribe to an event in `VFXService`, call shake/flash/freeze |
| Add a trail or particle FX | New method in `VFXService` |
| New gameplay phase | Add value to `GamePhase` enum, handle in `GameManager` + `HookController` |
| Tweak cast arc | `CAST_CENTER_VX`, `CAST_VX_RANDOM`, `CAST_VY`, `CAST_GRAVITY` in `Constants.ts` |
| Tweak dive feel | `DIVE_SPEED`, `DIVE_SWIPE_FORCE`, `DIVE_CENTER_PULL`, `DIVE_BOUNCE` in `Constants.ts` |
