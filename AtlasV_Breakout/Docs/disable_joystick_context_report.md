# Disable On-Screen Joystick - Context Report

## Summary

To disable the on-screen virtual joystick in Meta Horizon Studio, use **`FocusedInteractionService.enableFocusedInteraction()`**. This API disables default screen controls (including the movement joystick) and is designed for precision input scenarios like aiming, puzzles, or driving.

---

## API Call

```typescript
import { FocusedInteractionService } from 'meta/worlds';

FocusedInteractionService.get().enableFocusedInteraction({
  disableFocusExitButton: true,
  disableEmotesButton: true,
  interactionStringId: 'custom_controls',
});
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `disableFocusExitButton` | `boolean` | Hide the focus exit button |
| `disableEmotesButton` | `boolean` | Hide the emotes button |
| `interactionStringId` | `string` | Identifier for the interaction type |

---

## Current Implementation

The project already uses `FocusedInteractionService` in `Scripts/ClientSetup.ts`:

```typescript
private setupFocusInteraction()
{
  FocusedInteractionService.get().enableFocusedInteraction({
    disableEmotesButton: true, 
    disableFocusExitButton: true
  });
}
```

This is called in `onStart()` after a configurable delay (`initDelay`).

**Result:** The on-screen joystick is already disabled in this project because `enableFocusedInteraction()` is active.

---

## How It Works

1. **`FocusedInteractionService`** is a client-side only service
2. When `enableFocusedInteraction()` is called, it:
   - Disables default screen controls (movement joystick, jump button, etc.)
   - Optionally hides the focus exit button and emotes button
   - Enables custom touch input handling via touch events
3. The joystick remains hidden until `disableFocusedInteraction()` is called

---

## Re-enabling the Joystick

To restore the default on-screen joystick:

```typescript
FocusedInteractionService.get().disableFocusedInteraction();
```

---

## Alternative: Custom Input Handling

If you want to implement custom movement controls while the joystick is hidden, subscribe to `PlayerInputService`:

```typescript
import { 
  PlayerInputService, 
  PlayerInputAxis, 
  PlayerInputAxisCallbackPayload 
} from 'meta/worlds';

const subscription = PlayerInputService.get().subscribePlayerInputAxis(
  this,
  PlayerInputAxis.Left,
  (payload: PlayerInputAxisCallbackPayload) => {
    // payload.value is Vec2 with x,y from -1.0 to 1.0
    console.log(`Input: X=${payload.value.x}, Y=${payload.value.y}`);
  }
);
```

**Note:** `PlayerInputService` subscriptions work independently of whether the visual joystick is shown. The subscription receives input even when `FocusedInteractionService` hides the joystick UI.

---

## Important Rules

- `FocusedInteractionService` is **client-side only** — do not use in server-side code
- Always guard with `NetworkingService.get().isServerContext()` check
- The service is designed for precision input scenarios (aiming, puzzles, driving)
- Visual feedback (tap ripple, trail effects) can be configured via `setTapOptions()` / `setTrailOptions()`

---

## Related APIs

### Touch Input Events

When `FocusedInteractionService` is enabled, you can subscribe to raw touch events:

- `OnPlayerTouchStartEvent` — Touch begins
- `OnPlayerTouchMoveEvent` — Touch moves
- `OnPlayerTouchEndEvent` — Touch ends

These provide `screenPosition` (normalized 0-1) and `interactionIndex` (multi-touch finger tracking).

### Visual Feedback Configuration

```typescript
const service = FocusedInteractionService.get();

// Configure tap visual feedback
service.setTapOptions(true, {
  startColor: new Color(1, 1, 1, 1),
  endColor: new Color(0, 0, 1, 0),
  duration: 0.5,
  startScale: 0.5,
  endScale: 2.0,
});

// Configure trail visual feedback
service.setTrailOptions(true, {
  startColor: new Color(1, 1, 1, 1),
  endColor: new Color(0, 1, 0, 0.5),
  startWidth: 10,
  endWidth: 2,
  length: 0.5,
});

// Disable visual feedback
service.setTapOptions(false);
service.setTrailOptions(false);
```

---

## Conclusion

The on-screen joystick is **already disabled** in this project via the existing `ClientSetup.ts` implementation. No additional code changes are needed unless you want to:

1. Toggle the joystick on/off dynamically (use `disableFocusedInteraction()`)
2. Implement custom touch input handling
3. Configure visual feedback for touch interactions
