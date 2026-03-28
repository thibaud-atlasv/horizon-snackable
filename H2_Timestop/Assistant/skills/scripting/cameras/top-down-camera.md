# Top-Down Camera

Configurable top-down camera for overhead and isometric-style games. Supports smooth SmoothDamp-based following, optional look-ahead modes, level boundary constraints, and camera-relative input conversion.

> **Note:** Player movement scripts should route input through the camera using `inputToWorldDirection()`. See Step 4 for integration details.

| .skill File | Purpose |
|-------------|---------|
| `TopDownCamera.ts.skill` | Complete camera: pitch/yaw/distance, smoothing, look-ahead, boundaries, input conversion |

## Presets

> **IMPORTANT**: Use the **Default** preset (-75° pitch) for most "top-down camera" requests. The term "top-down" does not always mean pure overhead - users asking for a "top down camera" typically want the default, not -90°. Only use Pure Top-Down (-90°) if the user explicitly asks for "straight down", "directly overhead", specifically requests -90°, or follows up trying to correct the angle to be more overhead.

> A slight angle (-75°) gives better sense of movement and depth than pure overhead (-90°).

| Style | Distance | Pitch | Yaw | Look-Ahead | Notes |
|-------|----------|-------|-----|------------|-------|
| **Default** | 30 | -75 | 45 | none | Most "top-down" requests |
| **Pure Top-Down** | 30 | -90 | 0 | none | Straight overhead (classic) |
| **Isometric** | 25 | -60 | 45 | none | Classic isometric |
| **Action RPG** | 25 | -65 | 0 | velocity | Diablo-style |
| **Fixed Room** | 30 | -75 | 0 | none | Room-based, slight follow |
| **Arcade** | 40+ | -90 | 0 | none | Space Invaders, fixed camera |

---

## Prerequisites

- **Player entity required**: Camera auto-targets via `PlayerService.getLocalPlayer()`. Ensure a player entity exists before camera initializes.

---

## Setup

### Step 1: Copy Script File

> **⚠️ IMPORTANT**: You **MUST** use `copy_local_file` to copy this file. Do NOT attempt to create files from scratch or use any other method.

| Source | Destination |
|--------|-------------|
| `Assistant/skills/scripting/cameras/TopDownCamera.ts.skill` | `scripts/Camera/TopDownCamera.ts` |

### Step 2: Wait for Asset Build

```text
wait_for_asset_build: scripts/Camera/TopDownCamera.ts
```

### Step 3: Remove Conflicting Cameras from Scene

Search the scene for any existing camera entities or camera-controlling scripts that may conflict:
- Look for entities with camera behaviors (e.g., `ThirdPersonCamera`, `SideScrollingCamera`, `FirstPersonCamera`)
- Remove or disable conflicting camera scripts

### Step 4: Prepare Player Entity

Locate the player template and get all components on it. Walk through each component as a candidate for:
- **Camera-controlling components** - remove these (e.g., `ThirdPersonCameraComponent`, `FirstPersonCameraComponent`). Read the script code if necessary to determine if it controls the camera.
- **Movement/input scripts** - edit these to integrate with the camera (e.g., `PlayerMovementController`, `PlayerController`). Read the script code to find where input is converted to movement direction.

For movement scripts, use `inputToWorldDirection()` for screen-relative movement:

```typescript
import { TopDownCamera } from './Camera/TopDownCamera';

// In your movement update:
const camera = TopDownCamera.get();
const worldDir = camera
  ? camera.inputToWorldDirection(inputX, inputY)
  : new Vec3(inputX, 0, inputY).normalize();

// Apply worldDir to player position
const moveDelta = worldDir.mul(speed * deltaTime);
player.worldPosition = player.worldPosition.add(moveDelta);
```

**Parameters:**
- `inputX`: Left/right input (-1 to 1, positive = screen right)
- `inputY`: Up/down input (-1 to 1, positive = screen up)

**Returns:** Normalized `Vec3` direction on ground plane (y=0). Converts screen-relative input to world-space direction based on camera orientation. Works at all pitch angles including fully top-down (-90°).

**Implementation Requirement:** The method MUST use the camera's rotation quaternion to derive world directions. NEVER hardcode axis mappings:

```typescript
// CORRECT - rotation-based (works for ANY camera orientation)
const rotation = this.cameraTransform.worldRotation;
const camUp = rotation.mulVec3(Vec3.up);      // Screen "up" in world space
const camRight = rotation.mulVec3(Vec3.right); // Screen "right" in world space

// WRONG - hardcoded axis mapping (breaks if camera rotates)
const dir = new Vec3(-inputY, 0, inputX);  // DON'T DO THIS
```

**Fallback:** If camera is null, returns normalized input as world direction (inputX → world X, inputY → world Z).

**Why this matters:** With a 45° yaw (diamond grid view), pressing "up" on the thumbstick should move the player toward the top of the screen, not toward world +Z. This method handles that conversion automatically.

### Step 5: Create Camera Entity in Scene

> ⚠️ **Create the camera as a separate entity in the scene hierarchy.** Do NOT add camera scripts to the player template.

**If no camera entity exists:**

1. Create entity named `Camera` **in the scene** (not on player template)
2. Add component: `CameraPlatformComponent` (use this exact name - do NOT shorten to "Camera")
3. Add `TopDownCamera` component
4. Configure properties as needed (defaults are Stealth/Tactical style)

**If camera entity already exists:**

1. Remove existing camera behavior (ThirdPersonCamera, SideScrollingCamera, etc.)
2. Add `TopDownCamera` component

### Step 6: Configure (Optional)

Apply preset via `bulk_set_entity_component_properties` → `TopDownCamera`:

| Preset | targetDistance | cameraPitch | cameraYaw | lookAheadMode | lookAheadDistance |
|--------|----------------|-------------|-----------|---------------|-------------------|
| Default | 30 | -75 | 45 | "none" | 0 |
| Pure Top-Down | 30 | -90 | 0 | "none" | 0 |
| Isometric | 25 | -60 | 45 | "none" | 0 |
| Action RPG | 25 | -65 | 0 | "velocity" | 3 |
| Fixed Room | 30 | -75 | 0 | "none" | 0 |
| Arcade | 40+ | -90 | 0 | "none" | 0 |

### Fixed Room Camera

For a camera that stays mostly stationary (security cam / room-based view), use:

| Property | Value | Purpose |
|----------|-------|---------|
| `cameraYaw` | 0 | Axis-aligned (simpler input handling) |
| `deadZoneRadius` | 5-10 | Player can move this far before camera follows |
| `useBoundaries` | true | Constrain camera to room |
| `boundaryMinX/MaxX/MinZ/MaxZ` | Room bounds | Keep camera within level area |

This creates a camera that lets the player move freely within a zone before it starts following.

### Arcade Camera (Space Invaders, Asteroids, etc.)

Classic arcade games have a **completely fixed camera** showing the entire playfield. The camera never moves.

**Setup:**

1. Create an **empty entity** at the center of your playfield (e.g., named `PlayfieldCenter`)
2. Position it at the center of your game area (e.g., `(0, 0, 0)`)
3. Set the camera to target this entity instead of the player:

```typescript
// In your game initialization script:
const camera = TopDownCamera.get();
const playfieldCenter = world.getEntityByName("PlayfieldCenter");
if (camera && playfieldCenter) {
  camera.setTarget(playfieldCenter);
}
```

**Configuration:**

| Property | Value | Purpose |
|----------|-------|---------|
| `cameraPitch` | -90 | Straight down (pure overhead) |
| `cameraYaw` | 0 | Axis-aligned (screen-up = world -Z) |
| `targetDistance` | 40+ | Adjust until entire playfield is visible |
| `followSmoothing` | 0 | No smoothing needed (target doesn't move) |
| `useFixedHeight` | true | Keep camera at consistent height |

**Input mapping for Arcade style (yaw = 0, pitch = -90):**
- Screen UP → World -Z
- Screen DOWN → World +Z
- Screen LEFT → World -X
- Screen RIGHT → World +X

At pitch = -90° and yaw = 0°, `inputToWorldDirection()` returns these mappings.

---

## Configuration Reference

### Core Properties

| Property | Default | Description |
|----------|---------|-------------|
| `targetDistance` | 30 | Height above target |
| `cameraPitch` | -75 | Angle in degrees (-90 = top-down, -45 = isometric) |
| `cameraYaw` | 45 | Horizontal rotation (45 = diamond grid view) |
| `followSmoothing` | 10 | SmoothDamp responsiveness (higher = snappier) |
| `deadZoneRadius` | 0 | Distance before camera follows (0 = always centered) |

### Fixed Height (Ground-Relative)

| Property | Default | Description |
|----------|---------|-------------|
| `useFixedHeight` | true | Lock camera Y to ground, not player |
| `fixedHeight` | 0 | Ground Y coordinate (set via `setGroundHeight()`) |
| `targetHeightOffset` | 0 | Offset from fixed height |

### Look-Ahead (Disabled by Default)

| Property | Default | Description |
|----------|---------|-------------|
| `lookAheadMode` | "none" | `"none"`, `"input"`, or `"velocity"` |
| `lookAheadDistance` | 0 | How far camera leads |
| `lookAheadSmoothing` | 6 | Transition smoothness |

- **none**: Centered camera (stealth, tactical games)
- **input**: Camera leads based on stick direction (call `setInputDirection()` each frame)
- **velocity**: Camera leads based on movement direction

### Boundaries

| Property | Default | Description |
|----------|---------|-------------|
| `useBoundaries` | false | Enable camera clamping |
| `boundaryMinX/MaxX` | ±50 | X bounds |
| `boundaryMinZ/MaxZ` | ±50 | Z bounds |

### Optional Player Controls

| Property | Default | Description |
|----------|---------|-------------|
| `allowRotation` | false | Enable right-stick rotation |
| `rotationSmoothing` | 4 | Rotation smoothness |
| `allowZoom` | false | Enable zoom adjustment |
| `minDistance/maxDistance` | 8/30 | Zoom range |
| `mouseSensitivity` | 100 | Rotation input sensitivity |

---

## API Reference

### Static Access

```typescript
import { TopDownCamera } from './Camera/TopDownCamera';

const camera = TopDownCamera.get();  // Returns active camera or null
```

### Methods

```typescript
// Camera-relative input conversion (primary integration point)
camera.inputToWorldDirection(inputX: number, inputY: number): Vec3;

// Ground height (for fixed-height mode)
camera.setGroundHeight(y: number);

// Target
camera.setTarget(entity: Entity);

// Boundaries
camera.setBoundaries(minX, maxX, minZ, maxZ);
camera.clearBoundaries();

// Zoom (if allowZoom enabled)
camera.setDistance(distance: number);
camera.getDistance(): number;

// Orientation
camera.getYaw(): number;
camera.getPitch(): number;

// Input-based look-ahead (call from player controller each frame)
camera.setInputDirection(inputX: number, inputY: number);

// Look-ahead state
camera.getLookAheadOffset(): Vec3;
```

---

## Key Details

- **Single file**: All camera logic in `TopDownCamera.ts`
- **Frame-rate independent**: Uses SmoothDamp and exponential decay with deltaTime
- **Auto-targets local player**: If no target specified, follows local player automatically
- **Client-only**: Camera behavior runs only on client (server context returns early)
- **Diamond grid**: 45° yaw rotates world view so walls appear diagonal
- **MHS workaround**: `setCameraMode` called every frame (required due to platform bug)

## Troubleshooting

**Camera doesn't follow player:**
- Verify `CameraComponent` is on same entity as `TopDownCamera`
- Verify player entity exists (uses `PlayerService.getLocalPlayer()`)

**Camera snaps on game start:**
- Camera initializes to player position on first frame
- If player spawns at wrong position initially, camera will snap when corrected

**Look-ahead feels laggy:**
- `"velocity"` mode is reactive (follows movement)
- Use `"input"` mode for immediate response to stick input
- Call `setInputDirection()` from player controller each frame

**Player movement doesn't match camera direction:**
- Use `inputToWorldDirection()` to convert input to world-space direction
- Ensure you're passing stick X as first param, stick Y as second param
- Method handles all pitch angles including -90° (pure top-down)
