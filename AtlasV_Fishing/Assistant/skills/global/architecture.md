---
name: architecture
summary: H3_Fishing system map — which file owns what, how data flows
include: always
---

# H3_Fishing Architecture

## Ownership Map

| File | Owns | Communicates via |
|------|------|-----------------|
| `ClientSetup` | Camera lock, touch → events | fires `Events.PlayerTouchStart/End` via `OnFocusedInteractionInput*` |
| `GameManager` | Phase state machine, catch logic | fires all `Events.*` + `HUDEvents.*` |
| `RodController` | Bait physics, line visuals, reel input | fires `Events.BaitMoved`, `Events.FishHooked`, `Events.BaitSurfaced`, `Events.BaitHitBottom` |
| `FishRegistry` (service) | Fish def DB + live `IFishInstance` refs | queried by `RodController._tickFalling()` |
| `FishDefs` | Static `FISH_DEFS` array | imported by `FishSpawnService`, `FishRegistry`, `ZoneProgressionService` |
| `SimpleFishController` | Per-fish AI, position | implements `IFishInstance`, subscribes to `Events.InitFish` (targeted) |
| `FishSpawnService` (service) | Zone-based autonomous spawning | calls `WorldService.spawnTemplate`, fires `Events.InitFish` |
| `FishCollectionService` (service) | Catch journal (in-memory) | subscribes to `Events.FishCaught` + `Events.ProgressLoaded` |
| `ZoneProgressionService` (service) | Zone unlocks, floor Y, legendary chance | subscribes to `Events.FishCaught` + `Events.ProgressLoaded`; fires `Events.ZoneUnlocked`, `HUDEvents.UpdateProgress` |
| `PlayerProgressService` (service) | Persistence (PlayerVariables) | server: fetches/sets save; client: receives `NetworkEvents.ProgressData`, fires `Events.ProgressLoaded` |
| `GameCameraService` | Camera scroll to hooked fish zone | subscribes to `Events.FishHooked`, `Events.BaitSurfaced` |
| `FishingHUDViewModel` | Main HUD XAML data context | subscribes to phase, gauge, progress events |
| `CatchDisplayViewModel` | Catch screen + 3D fish display | subscribes to `HUDEvents.ShowCatch/Hide/Navigate`; spawns fish template at `fishAnchor` |
| `BubbleController` | Single rising bubble entity | self-contained, self-destructs on `worldPosition.y > WATER_SURFACE_Y` |
| `ImpactFxController` | Splash/hook FX | subscribes to `Events.FishHooked`, `Events.BaitHitBottom` |

## Data Flow: Cast → Catch

```
[Touch hold]    → ClientSetup → OnFocusedInteractionInputStarted
                → GameManager: IDLE → CHARGING
                → HUDEvents.UpdateGauge(value, 'cast') → FishingHUDViewModel

[Touch release] → GameManager: CHARGING → FALLING
                → Events.CastReleased → RodController (sets baitVX/VY)
                → Events.BaitMoved each frame → (lines, bait entity)

[Fish hit]      → RodController._tickFalling → FishRegistry.findHit()
                → Events.FishHooked → GameManager (REELING), GameCameraService
                → tap input → RodController._onTouchStart (burst + jump)
                → Events.BaitMoved + inst.setPosition() each frame

[Surface]       → RodController._tickReeling → Events.BaitSurfaced
                → GameManager._triggerCatch()
                → Events.FishCaught → FishCollectionService, ZoneProgressionService, PlayerProgressService
                → HUDEvents.ShowCatch → CatchDisplayViewModel (fish 3D display + cascade anim)
                → CATCH_DISPLAY phase

[Dismiss]       → dismissEvent (UiEvent) → CatchDisplayViewModel → HUDEvents.DismissCatch
                → GameManager → HUDEvents.HideCatch → CatchDisplayViewModel (despawn 3D fish)
                → FishRegistry.destroyFish()
                → RESET → IDLE
```

## Zone System

```
3 zones, always spawning independently of player unlock state.

Zone 1  Y  4.5 → -8.0   (surface)
Zone 2  Y -8.0 → -24.0  (mid-depth)
Zone 3  Y -24.0 → -38.5 (abyss)

Unlock gate = unique species caught (ZoneProgressionService):
  Zone 2: 4 unique   Zone 3: 10 unique

Floor Y = ZONE_FLOOR_Y[unlockedZones - 1] — limits bait depth.
```

## Extension Hooks

Events any new system can subscribe to without modifying existing code:

| Event | When fired | Use case |
|-------|-----------|---------|
| `Events.PhaseChanged` | Every phase transition | Audio cues, UI animations |
| `Events.FishHooked` | Bait touches fish | Hook FX, haptics |
| `Events.FishCaught` | Fish confirmed caught | Achievements, daily quests |
| `Events.BaitHitBottom` | Bait hits floor | Splash FX, miss counter |
| `Events.ZoneUnlocked` | New zone becomes accessible | Celebration UI, camera reveal |
| `Events.ProgressLoaded` | Save data seeded on session start | Initialize any save-dependent system |
| `HUDEvents.UpdateProgress` | Unique count changed | Drive any secondary progress display |
