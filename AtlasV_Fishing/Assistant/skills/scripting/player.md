---
name: player
summary: Player input, camera setup, and progression in H3_Fishing
include: on-demand
---

# Player Systems — H3_Fishing

## Input

All touch input is routed through `FocusedInteraction`. `ClientSetup` subscribes to the raw SDK events and re-fires them as local events or directly as game events.

```typescript
// Touch down → cast charge or catch dismiss (handled by GameManager)
@subscribe(OnFocusedInteractionInputStartedEvent)
onTouchStart(_p: OnFocusedInteractionInputEventPayload): void {
  EventService.sendLocally(Events.PlayerTouchStart, {});
}
```

During **Reeling**, `RodController` also subscribes to `OnFocusedInteractionInputStartedEvent` directly to handle tap-to-reel — no routing needed because it checks `_phase === GamePhase.Reeling`.

## Camera

Camera is fixed, set once in `ClientSetup` via `CameraService.setCameraMode(CameraMode.Fixed, ...)`. `GameCameraService` scrolls the camera vertically to follow the hooked fish zone during reeling.

The camera is positioned so the play area (9×16 world units) fills the portrait screen. `HALF_SCREEN_WORLD_HEIGHT = 8` is the tuning constant.

## Progression

Player state persisted across sessions: **catch collection only** (which species, how many times).

```
PlayerProgressService (server)
  └─ fetchVariable('fishCollection') → sends NetworkEvents.ProgressData to client
       └─ Events.ProgressLoaded (client local)
            ├─ FishCollectionService  (populates catch counts)
            └─ ZoneProgressionService (recomputes unlocked zones)
```

Zone unlock is **recomputed** from unique species count on each load — not stored directly. This means correcting the threshold constant retroactively fixes all players on next login.

## Zone access

The player can only fish as deep as the bait floor Y, which `ZoneProgressionService.getFloorY()` returns:

| Unlocked zones | Floor Y |
|----------------|---------|
| 1 | -8.0 |
| 2 | -24.0 |
| 3 | -38.5 |

Fish in locked zones still swim and are visible (the camera can scroll to show them) but the bait cannot reach them.

## UiService focus

`UiService.get().focus(entity, { fillPercentage: 3 })` is called when `ShowCatch` fires, to bring up the catch display as a focused UI (blocks world input). `UiService.get().unfocus()` is called on dismiss.
