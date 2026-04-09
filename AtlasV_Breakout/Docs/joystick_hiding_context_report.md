# Joystick Hiding Investigation - Context Report

## Executive Summary

**SOLUTION FOUND:** `FocusedInteractionService.enableFocusedInteraction()` is the correct and documented way to hide the default movement joystick in Meta Horizon Studio.

The breakout game already correctly implements this in `Scripts/ClientSetup.ts`. The joystick should be hidden when the game runs.

---

## Key Finding: FocusedInteractionService

### What It Does

`FocusedInteractionService` is specifically designed to **disable default screen controls** (including the movement joystick) for games that need custom touch input handling.

From the official documentation:
> "`FocusedInteractionService` disables default screen controls for precision input (aiming, puzzles, driving) and exposes touch events for tap, swipe, and pinch-to-zoom gestures."

### Current Implementation

The game already uses this correctly in `Scripts/ClientSetup.ts`:

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

### How It Works

When `enableFocusedInteraction()` is called:
1. **Default joystick UI is hidden** - The on-screen movement joystick disappears
2. **Touch events become available** - You can subscribe to touch events for custom input
3. **Optional buttons can be hidden** - Exit button and emotes button can be disabled

### Available Parameters

```typescript
enableFocusedInteraction({
  disableFocusExitButton: boolean,  // Hide the focus exit button
  disableEmotesButton: boolean,      // Hide the emotes button
  interactionStringId: string        // Identifier for the interaction type
})
```

### To Disable (Re-enable Default Controls)

```typescript
FocusedInteractionService.get().disableFocusedInteraction();
```

---

## Alternative Approaches Investigated

### 1. PlayerInputService - NOT for Hiding UI

`PlayerInputService.subscribePlayerInputAxis()` is for **reading joystick input**, not controlling visibility.

- Subscribing to joystick input does NOT hide the joystick
- Not subscribing does NOT hide the joystick
- This service is purely for input reading, not UI control

### 2. InputActionPositionOverride - Purpose Unknown

`InputActionPositionOverride` is imported in `ClientSetup.ts` but:
- Never used in the code
- No documentation found about its purpose
- Likely unrelated to hiding the joystick
- **Recommendation:** Remove this unused import

### 3. No Other Services Found

Extensive search found NO other services with methods to control joystick visibility:
- No `UIService` with joystick control
- No `PlayerControllerService` 
- No `InputService` with visibility methods
- No world/project settings for default UI
- No component properties on player or camera entities

---

## Touch Input Events Available

Once `enableFocusedInteraction()` is active, you can subscribe to these events:

### Basic Touch Events
- `OnFocusedInteractionInputStartedEvent` - Touch begins
- `OnFocusedInteractionInputMovedEvent` - Touch moves
- `OnFocusedInteractionInputEndedEvent` - Touch ends

### Event Payload Properties
```typescript
{
  interactionIndex: number,    // Touch index (0 = first finger, 1 = second)
  screenPosition: Vec2,        // Normalized screen coords (0 to 1)
  worldRayOrigin: Vec3         // Ray origin for 3D raycast from touch point
}
```

### Mode Change Events
- `OnPlayerEnteredFocusedInteractionEvent` - Player enters focused mode
- `OnPlayerExitedFocusedInteractionEvent` - Player exits focused mode

---

## Visual Feedback Configuration

`FocusedInteractionService` provides optional visual feedback for touch input:

### Tap Ripple Effect
```typescript
FocusedInteractionService.get().setTapOptions(true, {
  startColor: new Color(1, 1, 1, 1),
  endColor: new Color(0, 0, 1, 0),
  duration: 0.5,
  startScale: 0.5,
  endScale: 2.0,
});
```

### Touch Trail Effect
```typescript
FocusedInteractionService.get().setTrailOptions(true, {
  startColor: new Color(1, 1, 1, 1),
  endColor: new Color(0, 1, 0, 0.5),
  startWidth: 10,
  endWidth: 2,
  length: 0.5,
});
```

Pass `false` as the first argument to disable visual feedback.

---

## Important Rules

1. **Client-side only** - `FocusedInteractionService` must NOT be used in server-side code
2. **Already guarded** - `ClientSetup.ts` correctly checks `isServerContext()` before calling
3. **Persistent** - Once enabled, stays active until explicitly disabled
4. **No subscription cleanup needed** - Unlike `PlayerInputSubscription`, no cleanup required

---

## Current Game Architecture

### ClientSetup.ts Analysis

**Location:** `Scripts/ClientSetup.ts`

**Purpose:** Sets up client-side game initialization

**Key Methods:**
- `setupCamera()` - Configures fixed camera mode
- `setupFocusInteraction()` - Enables focused interaction (hides joystick)
- `onStart()` - Runs both setups after configurable delay

**Properties:**
- `camera?: Entity` - Optional camera entity reference
- `initDelay: number = 0` - Delay before setup (in seconds)

**Execution:**
- Runs on `OnEntityStartEvent` with `ExecuteOn.Everywhere`
- Guards against server execution with `isServerContext()` check
- Uses `setTimeout()` to delay initialization

### Unused Imports

The following imports are declared but never used:
- `InputActionPositionOverride` - No usage found
- `PlayerAimingService` - No usage found
- `PlayerInputService` - No usage found
- `PlayerService` - No usage found

**Recommendation:** Clean up unused imports to reduce confusion.

---

## Verification Steps

To verify the joystick is hidden:

1. **Build and run the game** in preview mode
2. **Check on mobile device or mobile emulator** - Joystick visibility is mobile-specific
3. **Verify `initDelay` is appropriate** - If set too high, joystick may be visible briefly
4. **Check console for errors** - Any errors in `ClientSetup.onStart()` would prevent setup

### Potential Issues

If the joystick is still visible:

1. **`ClientSetup` component not attached** - Verify it's attached to an entity in the scene
2. **`initDelay` too high** - Try setting to `0` for immediate hiding
3. **Script errors** - Check console logs for TypeScript/runtime errors
4. **Not testing on mobile** - Desktop doesn't show joystick UI
5. **`setupFocusInteraction()` not being called** - Add console.log to verify execution

---

## Related Documentation References

### Official MHS Documentation
- **Player Input Patterns** - `player-input-patterns/joystick-input-subscription.md`
- **Focused Interaction Service** - `player-input-patterns/focused-interaction-service.md`
- **Focused Interaction Gestures** - `player-input-patterns/focused-interaction-gestures.md`

### Key Quote from Documentation
> "**Player Input Patterns** handle mobile touch input via `PlayerInputService` and `FocusedInteractionService`. `PlayerInputService` manages joystick subscriptions (`PlayerInputAxis.Left`/`Right`) returning `Vec2` values (-1.0 to 1.0). **`FocusedInteractionService` disables default screen controls** for precision input (aiming, puzzles, driving) and exposes touch events for tap, swipe, and pinch-to-zoom gestures."

---

## Recommendations

### Immediate Actions
1. ✅ **No code changes needed** - Current implementation is correct
2. 🧹 **Clean up unused imports** in `ClientSetup.ts`
3. 🧪 **Test on mobile device** to verify joystick is hidden
4. 📝 **Add comment** explaining why `enableFocusedInteraction()` is called

### Code Cleanup Example

```typescript
import {
  CameraComponent,
  CameraMode,
  CameraService,
  Component,
  ExecuteOn,
  FocusedInteractionService,  // Used for hiding default joystick
  NetworkingService,
  OnEntityStartEvent,
  TransformComponent,
  component,
  property,
  subscribe,
  type Entity,
} from 'meta/worlds';

@component()
export class ClientSetup extends Component
{
  @property()
  private camera?: Entity;

  @property()
  private initDelay: number = 0;

  private setupCamera(): void
  {
    const cameraTransform = this.camera?.getComponent(TransformComponent) ?? this.entity.getComponent(TransformComponent)!;
    const cameraComponent = this.camera?.getComponent(CameraComponent) ?? this.entity.getComponent(CameraComponent);
    CameraService.get().setCameraMode(CameraMode.Fixed, {
      position: cameraTransform.worldPosition,
      rotation: cameraTransform.worldRotation,
      duration: 0,
      fov: cameraComponent?.fieldOfView ?? 60,
    });
  }

  /**
   * Hides the default movement joystick and enables custom touch input.
   * This is required for the breakout game's custom paddle controls.
   */
  private setupFocusInteraction(): void
  {
    FocusedInteractionService.get().enableFocusedInteraction({
      disableEmotesButton: true,
      disableFocusExitButton: true
    });
  }

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    setTimeout(() => {
      this.setupCamera();
      this.setupFocusInteraction();
    }, this.initDelay * 1000);
  }
}
```

### Optional Enhancements

If you want to provide visual feedback for touch input:

```typescript
private setupFocusInteraction(): void
{
  const service = FocusedInteractionService.get();
  
  // Hide default controls
  service.enableFocusedInteraction({
    disableEmotesButton: true,
    disableFocusExitButton: true,
    interactionStringId: 'breakout_paddle_control'
  });
  
  // Optional: Disable visual feedback for cleaner look
  service.setTapOptions(false);
  service.setTrailOptions(false);
}
```

---

## Conclusion

The breakout game **already correctly implements joystick hiding** using `FocusedInteractionService.enableFocusedInteraction()`. This is the standard, documented approach in Meta Horizon Studio.

No alternative methods exist for hiding the joystick. The implementation in `ClientSetup.ts` is correct and follows best practices.

If the joystick is still visible during testing, the issue is likely:
- Not testing on a mobile device (desktop doesn't show joystick)
- Component not attached to an entity in the scene
- Script errors preventing execution
- Delay (`initDelay`) causing brief visibility before hiding

The code is production-ready and requires no changes to hide the joystick.
