---
name: cameras
summary: Camera systems and integration with input directions. Handles top-down, isometric, third-person, first-person, and custom camera setups. Use for any camera-related tasks including camera creation, configuration, following behavior, and input conversion.
include: as_needed
---

# Camera Systems

This skill handles camera setup and configuration in Horizon worlds. You must follow the instructions in here for any camera related tasks.

## Critical: setCameraMode Must Be Set On Player Spawn

> ⚠️ **Engine Behavior**: The engine resets the camera to default mode when a player spawns. Custom cameras MUST call `setCameraMode()` in `OnPlayerCreateEvent`, not just in `onStart()`.

```typescript
@subscribe(OnPlayerCreateEvent, { execution: ExecuteOn.Everywhere })
onPlayerCreate() {
  // Only run on client
  if (NetworkingService.get().isServerContext()) {
    return;
  }

  // Set camera mode AFTER player spawns - runs after engine's default camera reset
  const camera = this.entity.getComponent(CameraComponent);
  if (camera) {
    CameraModeService.get().setCameraMode(CameraMode.Custom, { camera });
  }
}
```

**Why this is required:**
- The engine automatically resets the camera to default mode when a player spawns
- Calling `setCameraMode()` only in `onStart()` gets overwritten by the engine's reset
- `OnPlayerCreateEvent` fires AFTER the engine's reset, so our custom camera takes effect
- This applies to ALL custom camera scripts, regardless of camera type

**Important:**
- Use `ExecuteOn.Everywhere` with a manual `isServerContext()` check (scene entities have no owner)
- The event fires for all players joining, which ensures the local player's camera is always set

**Correct pattern:**
1. Position your camera in `onStart()` (transform setup)
2. Call `setCameraMode()` in `OnPlayerCreateEvent` after checking for server context

---

## Critical: Camera Entity Placement

> ⚠️ **NEVER add camera scripts to the player entity.** The camera must be a **separate entity in the scene**.

Camera setup requires TWO distinct entities:
1. **Camera entity** (in scene) - Contains `CameraPlatformComponent` and camera script (e.g., `TopDownCamera`)
2. **Player entity** (template) - Contains movement script that calls the camera's `inputToWorldDirection()`

**Common mistake:** Adding the camera script to the player template. This is WRONG. The camera is a scene-level entity that follows the player, not a component on the player.

## Critical: Two-Part Integration

Creating a camera is NOT enough. Both pieces must be connected:

1. **Camera script** (on Camera entity in scene) - must have `inputToWorldDirection(inputX, inputY)` method
2. **Movement script** (on Player entity) - must CALL that method to convert input to world direction

```typescript
// In player movement script:
const camera = MyCamera.get();
const worldDir = camera
  ? camera.inputToWorldDirection(inputX, inputY)
  : new Vec3(inputX, 0, inputY).normalize();
```

Without this, movement will NOT match screen direction (e.g., "up" won't move toward top of screen).

## Mandatory: Rotation-Based Input Conversion

**ALWAYS** implement `inputToWorldDirection()` using the camera's rotation quaternion. **NEVER** hardcode axis mappings or assume a fixed orientation.

```typescript
public inputToWorldDirection(inputX: number, inputY: number): Vec3 {
  const rotation = this.cameraTransform.worldRotation;

  // Derive camera axes from rotation - works for ANY orientation
  const camUp = rotation.mulVec3(Vec3.up);      // Screen "up" in world space
  const camRight = rotation.mulVec3(Vec3.right); // Screen "right" in world space

  // Project onto ground plane and combine based on input
  const dir = new Vec3(
    camUp.x * inputY + camRight.x * inputX,
    0,
    camUp.z * inputY + camRight.z * inputX
  );

  const mag = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
  return mag > 0.001 ? dir.mul(1 / mag) : Vec3.zero;
}
```

**Why rotation-based?**
- Works for any camera orientation (top-down, isometric, rotated, etc.)
- Automatically handles camera yaw changes at runtime
- No need to know the camera's coordinate system ahead of time
- Single implementation works for all camera types

## Semantic Input Mapping

Input handling involves two separate concerns that must not be conflated:

1. **Screen-to-world conversion** — What world direction does "up on screen" correspond to? This is geometry, handled by the camera.

2. **Gameplay interpretation** — What does this input *mean* for game mechanics? This is design, handled by the movement system.

### The Camera's Role

The camera answers: *"Given screen-relative input, what is the equivalent direction in world space?"*

When `inputToWorldDirection(0, 1)` returns `(-0.707, 0, -0.707)`, that's the correct answer — that IS the world-space direction corresponding to "up on screen" from a 45° isometric view. The camera is doing its job.

### The Movement System's Role

The movement system must decide: *"What should this input DO in my game?"*

For free-movement games (ARPGs, twin-stick shooters), the answer is straightforward: move in the direction the camera reports.

For constrained-movement games (grids, tiles, lanes, boards), inputs often have **fixed semantic meaning** independent of camera orientation:
- "Up" might always mean "advance on the board"
- "Left/Right" might always mean "change lanes"
- The camera angle shouldn't change *which* axis these map to — only *which direction* along that axis feels like "forward" or "right" to the player.

### The Separation Principle

> **Game design determines WHAT each input means (which axis, which action).**
> **Camera determines HOW that maps to screen orientation (which direction feels natural).**

When these responsibilities blur — when movement code asks the camera for a direction and then tries to "snap" it to game constraints — you get fragile systems that break at certain camera angles.

### Applying the Principle

The movement system should first determine the semantic meaning of input (from raw input), then use the camera only to resolve direction on the game-defined axis:

```typescript
// Example: up/down = progress axis (Z), left/right = lateral axis (X)
// Adapt axis assignments to your game's design

const isForwardBack = Math.abs(rawInputY) >= Math.abs(rawInputX);

if (isForwardBack) {
  // Game design decides: up/down controls Z axis
  const camUp = camera.inputToWorldDirection(0, 1);
  const axisSign = camUp.z >= 0 ? 1 : -1;  // Camera picks + or - direction
  const inputDir = rawInputY >= 0 ? 1 : -1;
  return new Vec3(0, 0, axisSign * inputDir);
} else {
  // Game design decides: left/right controls X axis
  const camRight = camera.inputToWorldDirection(1, 0);
  const axisSign = camRight.x >= 0 ? 1 : -1;  // Camera picks + or - direction
  const inputDir = rawInputX >= 0 ? 1 : -1;
  return new Vec3(axisSign * inputDir, 0, 0);
}
```

The key insight: raw input magnitude determines *which* axis (game design), camera direction determines *which sign* on that axis (screen orientation).

### Recognizing the Problem

If movement works at some camera angles but breaks at others (especially 45° diagonals), the likely cause is movement logic that doesn't distinguish between:
- The geometric question: "What direction is this input pointing?"
- The semantic question: "What does this input mean in my game?"

The fix is never in the camera. The camera's conversion is purely geometric and correct. The fix is in how the movement system interprets and constrains that information based on game design.

---

## Decision Process

1. **Use pre-built TopDownCamera** → Load `top-down-camera.md`
   - Top-down, overhead, isometric, bird's eye views
   - ARPG, twin-stick, stealth, tactical, RTS
   - Classic arcade (Space Invaders, Asteroids, Pac-Man style)
   - Puzzle games with overhead view
   - This may be edited and customized for your game

2. **Build custom camera script** (third-person, first-person, side-scrolling, etc.):
   - Reference `Assistant/skills/scripting/cameras/TopDownCamera.ts.skill` for patterns (SmoothDamp following, input conversion, etc.)
   - Adapt the architecture to the specific camera style needed

---

## Top-Down Camera (Pre-built)

Best for: overhead views, isometric games, ARPGs, twin-stick shooters, stealth, tactical games, classic arcade games.
Can be fixed or follow the player.

For full setup instructions, load the documentation file: `Assistant/skills/scripting/cameras/top-down-camera.md`

---

## Building Other Camera Types

For camera types without pre-built scripts, create a custom camera component.

### Step 1: Remove Conflicting Cameras

Search the scene for existing camera entities or camera-controlling scripts:
- Look for entities with camera behaviors (e.g., `ThirdPersonCamera`, `SideScrollingCamera`, `FirstPersonCamera`)
- Check the player template for camera-controlling components
- Remove or disable conflicting camera scripts

### Step 2: Prepare Player Entity

Locate the player template and examine all components:
- **Camera-controlling components** - remove these (e.g., `ThirdPersonCameraComponent`, `FirstPersonCameraComponent`)
- **Movement/input scripts** - these will need to integrate with your camera's `inputToWorldDirection()` method

### Step 3: Create Camera Entity in Scene

> ⚠️ **Create the camera as a separate entity in the scene hierarchy.** Do NOT add camera scripts to the player template.

There are two approaches to camera control in Horizon:

**Option A: Entity-based camera (recommended for complex cameras)**

1. Create entity named `Camera` **in the scene** (not on player template)
2. Add component: `CameraPlatformComponent` (use this exact name - do NOT shorten to "Camera")
3. Add your custom camera script component
4. Your script manipulates the entity's transform; the platform handles rendering

**Option B: CameraService-based (simpler, for fixed cameras)**

```typescript
import { CameraService, CameraMode, CameraModeEasing } from 'meta/worlds';

// In your camera script:
const cameraService = CameraService.get();
cameraService.setCameraMode(CameraMode.Fixed, {
  position: cameraPosition,
  rotation: cameraRotation,
  fov: 70,
  duration: 0.5,
  easing: CameraModeEasing.EaseOut,
});
```

### Step 4: Integrate Movement Scripts

Update player movement to use camera-relative input:

```typescript
import { YourCamera } from './Camera/YourCamera';

const camera = YourCamera.get();
const worldDir = camera
  ? camera.inputToWorldDirection(inputX, inputY)
  : new Vec3(inputX, 0, inputY).normalize();
```

### Reference Implementation

Use `TopDownCamera.ts.skill` as a pattern for:

- **SmoothDamp-based following** - smooth camera movement with configurable responsiveness
- **Target tracking** - auto-targeting local player via `PlayerService.getLocalPlayer()`
- **Input conversion** - converting screen-relative input to world-space directions
- **Client-only execution** - camera logic that only runs on client
- **Static singleton access** - `YourCamera.get()` pattern for easy access from other scripts

Reference file: `Assistant/skills/scripting/cameras/TopDownCamera.ts.skill`
