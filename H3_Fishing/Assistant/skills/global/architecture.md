---
name: architecture
summary: H3_Fishing system map — which file owns what, how data flows
include: always
---

# H3_Fishing Architecture

## Ownership Map

| File | Owns | Communicates via |
|------|------|-----------------|
| `ClientSetup` | Camera, touch input | fires `Events.PlayerTouchStart/End` |
| `GameManager` | Phase state machine, bait physics | fires all `Events.*` + `HUDEvents.*` |
| `FishRegistry` (service) | Fish def DB + live `IFishInstance` refs | queried by `GameManager` |
| `FishDefs` | Def registration at module load | `FishRegistry.register()` static call |
| `FishController` | Per-fish AI, position | implements `IFishInstance`, subscribes to `Events.InitFish` |
| `FishSpawnService` (service) | Wave spawning | calls `WorldService.spawnTemplate`, fires `Events.InitFish` |
| `FishCollectionService` (service) | Catch journal | subscribes to `Events.FishCaught` |
| `BaitController` | Bait entity transform | subscribes to `Events.BaitMoved` |
| `GaugeController` | Gauge entity visual | subscribes to `HUDEvents.UpdateGauge` |
| `FishingLineRenderer` | Line entity visual | subscribes to `Events.BaitMoved` |
| `WaterLayerController` | 10 water layer entities | per-frame caustic animation |
| `AmbientFXController` | God rays, particles, seaweed | per-frame animation |
| `BubbleController` | Single bubble entity | self-contained, self-destructs |
| `BubbleSpawner` | Ambient bubble timing | spawns `Bubble.hstf` templates |
| `FishingHUDViewModel` | Main HUD data context | subscribes to phase + gauge events |
| `CatchDisplayViewModel` | Catch screen data context | subscribes to `HUDEvents.ShowCatch/Hide/Navigate` |

## Data Flow: Cast → Catch

```
[Touch hold]  → ClientSetup → Events.PlayerTouchStart
                → GameManager: IDLE → CHARGING
                → HUDEvents.UpdateGauge(value, 'cast')  → GaugeController

[Touch release]→ GameManager: → FALLING
                → Events.BaitMoved(x,y) each frame  → BaitController, FishingLineRenderer

[Fish hit]     → GameManager queries FishRegistry.findHit()
                → Events.FishHooked  → (future: audio, particles)
                → REELING phase
                → Events.BaitMoved + FishRegistry.getInstance().setPosition()

[Surface]      → GameManager → Events.FishCaught
                → FishCollectionService.recordCatch()
                → HUDEvents.ShowCatch  → CatchDisplayViewModel
                → CATCH_DISPLAY phase

[Dismiss]      → HUDEvents.HideCatch
                → FishRegistry.destroyFish()
                → RESET → IDLE
```

## Extension Hooks

Events that any new system can subscribe to without modifying existing code:

| Event | When fired | Use case |
|-------|-----------|---------|
| `Events.PhaseChanged` | Every phase transition | Audio cues, UI animations, mechanic modifiers |
| `Events.FishHooked` | Bait touches fish | Hook particle FX, haptic feedback |
| `Events.FishCaught` | Fish reaches surface | Achievement system, daily quests |
| `Events.WaveStart` | New wave spawned | Difficulty announcement, wave counter |
| `Events.BaitHitBottom` | Bait hits floor | Splash FX, miss counter |
| `Events.Restart` | Full game reset | Clear all services, reset UI |
