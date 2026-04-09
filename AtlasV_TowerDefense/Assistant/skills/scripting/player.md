---
name: scripting-player
summary: Player input model for H5 TowerDefense — touch input via FocusedInteraction, camera setup, input event flow.
include: as_needed
---

# Player Input

## Input Model

The game uses MHS `FocusedInteraction` mode — all touch input is captured and forwarded as `OnFocusedInteractionInputStartedEvent` / `OnFocusedInteractionInputEndedEvent`.
Set up once in `ClientSetup.ts` with a `setTimeout` delay after `onStart`.

```typescript
FocusedInteractionService.get().enableFocusedInteraction({
  disableEmotesButton: true,
  disableFocusExitButton: true,
});
```

## Camera

Fixed camera, configured in `ClientSetup.ts`:
```typescript
CameraService.get().setCameraMode(CameraMode.Fixed, {
  position: cameraTransform.worldPosition,
  rotation: cameraTransform.worldRotation,
  duration: 0,
  fov: 60,
});
```
Camera position/rotation is read from a scene entity (linked via `@property()` in `ClientSetup`).

## Touch → Game Event Flow

```
Finger down → OnFocusedInteractionInputStartedEvent (position in [0,1] normalized screen)
  → PlacementService: picks up tower selection, starts drag preview
  → TowerController: tapping an placed tower → TowerSelected event

Finger up → OnFocusedInteractionInputEndedEvent
  → PlacementService: if valid cell → GridTapped event → TowerService places tower
                       if invalid → preview destroyed, action cancelled
```

## PlacementService Drag Flow

```
selectTower(id)          — called when player taps a tower in shop
  → spawns preview entity + range indicator
  → subscribes to input events

onTouchMoved(screenPos)  — snaps preview to nearest grid cell
  → green tint = valid cell (not path, not occupied)
  → red tint = invalid

onTouchEnded(screenPos)  — if valid: sendLocally(GridTapped, {col, row})
                         → TowerService._tryPlace() spawns real tower
```

## Adding a New Input Gesture

1. Subscribe to `OnFocusedInteractionInputStartedEvent` or `OnFocusedInteractionInputEndedEvent` in a service/component
2. Convert normalized screen coords to world coords if needed via camera + PathService.cellToWorld()
3. Send a `LocalEvent` — never handle gameplay logic directly in the input handler
