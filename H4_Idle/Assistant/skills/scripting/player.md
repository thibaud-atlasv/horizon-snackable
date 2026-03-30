---
name: player
summary: Player input, camera, and progression in H4_Idle
include: on-demand
---

# Player Systems — H4_Idle

## Input

All touch input is routed through `FocusedInteraction`. `ClientSetup` subscribes to SDK events and fires `Events.PlayerTap`.

```typescript
@subscribe(OnFocusedInteractionInputStartedEvent)
onTouchStart(_p: OnFocusedInteractionInputEventPayload): void {
  EventService.sendLocally(Events.PlayerTap, {});
}
```

`ResourceService` (or `GameManager`) subscribes to `Events.PlayerTap` to add the click value. Visual effects components can also subscribe independently.

## Camera

Fixed camera set in `ClientSetup` via `CameraService.setCameraMode(CameraMode.Fixed, ...)`. Portrait orientation, camera positioned to frame the 9×16 play area.

## Progression / Persistence

```
SaveService (server)
  └─ fetchVariable('idleSave') → sends NetworkEvents.ProgressData to client
       └─ Events.ProgressLoaded (client local)
            ├─ ResourceService.seed(resources)
            ├─ GeneratorService.seed(generatorCounts)
            ├─ UpgradeService.seed(purchasedUpgrades)
            └─ GameManager.applyOfflineIncome(secondsSinceLastSeen)
```

**Save shape:**
```typescript
{ resources: Record<string, number>, generators: Record<string, number>,
  upgrades: number[], lastSeen: number }  // lastSeen = Unix timestamp
```

**Offline income** is computed once on load: `offlineAmount = totalOutput * secondsElapsed * OFFLINE_EFFICIENCY`. Show a popup via `Events.OfflineIncome`.

Zone/tier unlock is recomputed from owned generators + resources on load — not stored directly. Correcting a threshold constant fixes all players on next login.

## Click Value

`clickValue = BASE_CLICK_VALUE * clickMultiplier`

`clickMultiplier` is recomputed by `UpgradeService` whenever an upgrade that affects clicks is purchased. `ResourceService` queries `UpgradeService.getClickMultiplier()` on each tap.
