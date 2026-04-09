# Movement Joystick Visibility Bug - Context Report

## Issue Summary
The user reports that when `FocusedInteractionService.enableFocusedInteraction()` is called in `Scripts/ClientSetup.ts`, the movement joystick remains visible on screen. They expected it to be hidden during Focused Interaction mode.

---

## Current Implementation

### Scripts/ClientSetup.ts
```typescript
private setupFocusInteraction()
{
  FocusedInteractionService.get().enableFocusedInteraction({
    disableEmotesButton: true, 
    disableFocusExitButton: true
  });
}
```

**Current behavior:** Only hides the emotes button and focus exit button. The movement joystick remains visible.

---

## API Research Findings

### FocusedInteractionService.enableFocusedInteraction()

According to the documentation, `enableFocusedInteraction()` accepts the following parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `disableFocusExitButton` | `boolean` | Hide the focus exit button |
| `disableEmotesButton` | `boolean` | Hide the emotes button |
| `interactionStringId` | `string` | Identifier for the interaction type |

**Key Finding:** There is **NO parameter to hide the movement joystick** in `enableFocusedInteraction()`.

### What FocusedInteractionService Actually Does

From the documentation:
> "`FocusedInteractionService` disables default screen controls for precision input (aiming, puzzles, driving) and exposes touch events via `screenPosition` (normalized 0–1) and `interactionIndex` (multi-touch finger tracking)."

**Important:** The service is designed to:
1. Disable *default screen controls* (exit button, emotes)
2. Expose raw touch events for custom input handling
3. **It does NOT automatically hide the movement joystick**

---

## Root Cause Analysis

### Why the Joystick is Still Visible

The movement joystick is a **separate UI element** from the buttons controlled by `FocusedInteractionService`. The API documentation shows that:

1. `FocusedInteractionService` only controls:
   - Focus exit button
   - Emotes button
   - Visual feedback (tap ripples, trails)

2. The movement joystick is managed by a **different system** (likely part of the player locomotion UI)

### What "Disables Default Screen Controls" Means

The phrase "disables default screen controls" in the documentation is misleading. It actually means:
- Disables the *buttons* specified in the options
- Exposes raw touch input events
- **Does NOT disable or hide the movement joystick**

---

## Potential Solutions

### Option 1: PlayerInputService Subscription Management (Unlikely to Hide UI)

The `PlayerInputService` allows disabling joystick *input callbacks*, but this likely doesn't hide the visual joystick:

```typescript
private moveSubscription: Maybe<PlayerInputSubscription> = null;

// In onStart:
this.moveSubscription = PlayerInputService.get().subscribePlayerInputAxis(
  this,
  PlayerInputAxis.Left,
  (payload) => { /* handle input */ }
);

// To disable input (but probably not hide UI):
this.moveSubscription?.disable();
```

**Limitation:** The `.disable()` method pauses callbacks but likely doesn't hide the on-screen joystick visual.

### Option 2: Missing API for Joystick Visibility

Based on the research, there appears to be **no documented API** to hide the movement joystick specifically. The available APIs are:

- `FocusedInteractionService` - Controls exit/emotes buttons only
- `PlayerInputService` - Manages input subscriptions, not UI visibility
- `AvatarService` - Controls avatar visibility, not input UI
- `PlayerService` - Manages player entities, not input UI

### Option 3: Possible Undocumented API

The `ClientSetup.ts` file imports `InputActionPositionOverride` which is not used:

```typescript
import {
  // ... other imports
  InputActionPositionOverride,  // ← Imported but unused
  // ...
} from 'meta/worlds';
```

This *might* be related to input UI control, but there's no documentation for it in the available resources.

---

## Recommendations

### For the User

1. **Verify Expected Behavior:** Confirm whether hiding the joystick is actually supported in MHS. The game is designed for a fixed camera with touch-based input, so the joystick might be intentionally always visible.

2. **Check for Updates:** This might be a known limitation or a feature request for the MHS team.

3. **Alternative Approach:** If the game doesn't need player movement (like Breakout), consider:
   - Disabling player locomotion entirely (if such an API exists)
   - Using a custom input system that doesn't rely on the default joystick
   - Accepting the joystick visibility as a platform limitation

### For Further Investigation

1. **Search for locomotion control APIs:** Look for methods like `setLocomotionEnabled()` or similar that might disable both movement and the joystick UI.

2. **Investigate `InputActionPositionOverride`:** This imported but unused type might be relevant.

3. **Check MHS forums/documentation:** This might be a known limitation with a workaround.

---

## Code Pointers

### Relevant Files
- `Scripts/ClientSetup.ts` - Where `FocusedInteractionService` is configured
- Line 38-41: `setupFocusInteraction()` method

### Relevant Imports
```typescript
import {
  FocusedInteractionService,
  InputActionPositionOverride,  // Unused - might be relevant
  PlayerInputService,
  // ...
} from 'meta/worlds';
```

---

## Conclusion

**The movement joystick visibility cannot be controlled via `FocusedInteractionService.enableFocusedInteraction()`**. This API only controls the exit button and emotes button. There is no documented API in the available resources to hide the movement joystick specifically.

This appears to be either:
1. A missing feature in the MHS API
2. An intentional design decision (joystick always visible on mobile)
3. Controlled by an undocumented API

The user should verify with Meta Horizon Studio documentation or support whether hiding the movement joystick is a supported feature.
