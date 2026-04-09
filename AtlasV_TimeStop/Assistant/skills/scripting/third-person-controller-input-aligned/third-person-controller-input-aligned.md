---
name: third-person-controller-input-aligned
summary: Camera-relative third-person player movement controller. Use when implementing player movement that responds to thumbstick input relative to the current camera orientation.
include: as_needed
---

# Third Person Controller (Input Aligned)

Camera-relative player movement controller for third-person games. Player moves relative to where the camera is looking - stick forward moves away from camera, stick back moves toward camera, left/right strafe relative to camera view.

| .skill File | Purpose |
|------|---------|
| `Assistant/skills/scripting/third-person-controller-input-aligned/ThirdPersonControllerInputAligned.ts.skill` | Movement controller script - handles input and camera-relative movement |

## How It Works

The controller uses `CameraService` to get the current camera's forward direction each frame:
- **Stick Forward (Y+)**: Move away from camera
- **Stick Back (Y-)**: Move toward camera
- **Stick Left (X-)**: Move left relative to camera view
- **Stick Right (X+)**: Move right relative to camera view

The player automatically rotates to face the movement direction using smooth quaternion interpolation.

---

## Setup Workflow

- [ ] Step 1: Copy the controller script
- [ ] Step 2: Wait for asset build
- [ ] Step 3: **CRITICAL** — Check and fix incompatible camera controllers
- [ ] Step 4: Set up player template with physics body and collider
- [ ] Step 5: Add the controller component
- [ ] Step 6: Verify setup

---

### Step 1: Copy the Controller Script

> **⚠️ IMPORTANT**: Use `copy_local_file` to copy the skill file. Do NOT create from scratch.

| Source | Destination |
|--------|-------------|
| `Assistant/skills/scripting/third-person-controller-input-aligned/ThirdPersonControllerInputAligned.ts.skill` | `scripts/ThirdPersonControllerInputAligned.ts` |

---

### Step 2: Wait for Asset Build

```text
wait_for_asset_build: scripts/ThirdPersonControllerInputAligned.ts
```

---

### Step 3: 🚨 CRITICAL — Check and Fix Incompatible Camera Controllers

> **THIS STEP IS MANDATORY.** You MUST complete this before proceeding. Skipping this step will cause uncontrollable player spinning.

**Action Required:**

1. **Search for existing camera controllers** in the project:
   ```text
   grep_local_files: pattern "CameraService|cameraTransform|worldRotation" in scripts/*.ts
   ```

2. **Inspect each camera script** for orientation-locking logic — code that sets camera rotation based on player rotation:
   ```typescript
   // 🚨 INCOMPATIBLE PATTERNS — look for these:
   cameraTransform.worldRotation = playerTransform.worldRotation;
   cameraTransform.worldRotation = Quaternion.lookRotation(playerTransform.worldForward, ...);
   // Any code reading player rotation/forward to set camera orientation
   ```

3. **If incompatible logic is found, ALTER the camera script:**
   - **DO NOT remove** the camera controller
   - **MODIFY** the orientation logic to be independent of player rotation
   - Keep position-following logic intact

   ```typescript
   // ❌ BEFORE (orientation locked to player)
   cameraTransform.worldRotation = Quaternion.lookRotation(playerTransform.worldForward, Vec3.up);

   // ✅ AFTER (orientation independent — use fixed offset, orbit, or user-controlled)
   const offsetDirection = this.entity.getComponent(TransformComponent)!.worldPosition.sub(playerPosition).normalize();
   cameraTransform.worldRotation = Quaternion.lookRotation(offsetDirection.mul(-1), Vec3.up);
   ```

**Why This Matters:** Camera-relative movement + camera-follows-player-rotation = feedback loop. Player rotates → camera rotates → movement direction changes → player rotates again → infinite spin.

---

### Step 4: Set Up Player Template

Determine current state:
- **New player template?** → Follow "Full Player Setup" below
- **Existing player template without physics?** → Follow "Add Physics to Existing Player" below
- **Existing player with physics already configured?** → Skip to Step 4

#### Full Player Setup (New Template)

Create a player template with the required physics configuration:

**1. Create Player Entity (Root)**

```text
create_entity → name: "player"
```

**2. Add BasePlayer Component**

```text
add_component_to_entity → BasePlayer
```

**3. Add Physics Body Component**

```text
add_component_to_entity → PhysicsBody
```

**4. Configure Physics Body Properties**

```text
bulk_set_entity_component_properties → PhysicsBodyPlatformComponent:
  - type: DynamicCollider
  - collisionEnabled: true
  - useGravity: true
  - mass: 10.0
  - linearDamping: 1.0
  - angularDamping: 100000000.0  (prevents physics-induced rotation)
  - lockedRotationAxes: 7        (locks X, Y, Z rotation - script controls rotation)
  - maxAngularVelocity: 0.0
```

**5. Create Collider Child Entity**

```text
create_entity → name: "Collider", parent: player entity
```

**6. Add Capsule Collider Component**

```text
add_component_to_entity → ColliderCapsule (on Collider entity)
```

**7. Configure Collider Properties**

```text
bulk_set_entity_component_properties → ColliderCapsulePlatformComponent:
  - axis: Y
  - length: 1.0
  - radius: 0.5
  - collisionLayer: Layer2

TransformPlatformComponent (on Collider entity):
  - localPosition: (0, 1.0, 0)  (centers capsule on player body)
```

**8. Create Visual (if no existing mesh)**

If the player has no visual mesh, create a simple cube placeholder:

```text
create_shape → primitive_type: "Cube", parent: player entity

Rename the created entity to "Visuals"
```

> **⚠️ IMPORTANT: Remove Auto-Added Physics Components**
>
> The `create_shape` tool automatically adds a `PhysicsBodyPlatformComponent` and `ColliderBoxPlatformComponent` to cube primitives by default. **These MUST be removed** from the Visuals entity because:
> - The player root already has its own physics body and collider (configured in steps 3-7)
> - Having physics components on the Visuals child will cause physics conflicts and unexpected behavior
>
> **Remove the components using:**
> ```text
> remove_component_from_entity → entity: Visuals entity, component: PhysicsBody
> remove_component_from_entity → entity: Visuals entity, component: ColliderBox
> ```

After removing the physics components, configure the visual properties:

```text
bulk_set_entity_component_properties → MeshPlatformComponent:
  - castsShadows: true

TransformPlatformComponent:
  - localPosition: (0, 0.875, 0)
  - localScale: (1, 1.75, 1)
```

#### Add Physics to Existing Player

If player template exists but lacks physics configuration:

**1. Add Physics Body to Root Entity**

```text
add_component_to_entity → PhysicsBody (on player root)
bulk_set_entity_component_properties → PhysicsBodyPlatformComponent:
  - type: DynamicCollider
  - collisionEnabled: true
  - useGravity: true
  - mass: 10.0
  - linearDamping: 1.0
  - angularDamping: 100000000.0
  - lockedRotationAxes: 7
  - maxAngularVelocity: 0.0
```

**2. Create Collider Child Entity**

```text
create_entity → name: "Collider", parent: player root
add_component_to_entity → ColliderCapsule
bulk_set_entity_component_properties → ColliderCapsulePlatformComponent:
  - axis: Y
  - length: 1.0
  - radius: 0.5
  - collisionLayer: Layer2

TransformPlatformComponent:
  - localPosition: (0, 1.0, 0)
```

> **DO NOT** modify existing visual meshes - this skill is for input/movement only.

---

### Step 5: Add the Controller Component

```text
add_component_to_entity → ThirdPersonControllerInputAligned (on player root)
```

**Default Properties** (adjust as needed):

| Property | Default | Description |
|----------|---------|-------------|
| `moveSpeed` | 6.0 | Movement speed in units/second |
| `rotationSpeed` | 1000.0 | Rotation speed in degrees/second |

---

### Step 6: Verify Setup

Check the following:

1. **Script compiled**: `scripts/ThirdPersonControllerInputAligned.ts` exists without errors
2. **Player root has**:
   - `BasePlayerPlatformComponent`
   - `PhysicsBodyPlatformComponent` (type: DynamicCollider)
   - `ThirdPersonControllerInputAligned`
3. **Collider child has**:
   - `ColliderCapsulePlatformComponent` (axis: Y)
   - Position offset ~(0, 1, 0)
4. **Physics body settings**:
   - `lockedRotationAxes: 7` (all rotation locked)
   - `angularDamping: 100000000.0` (very high)
   - `useGravity: true`

---

## Camera Requirements

The controller reads camera orientation from `CameraService.get().forward`. The camera script must use `CameraService.setCameraMode()` to set camera position/rotation. If the camera doesn't use CameraService, the controller will fall back to world-space movement.

This controller works with most camera setups. The only incompatible pattern is cameras that lock their orientation to the player's rotation (see "Camera Feedback Loop Warning" below).

---

## ⚠️ Camera Feedback Loop Reference

> **Note:** This section provides background context. The mandatory fix is performed in **Step 3** above.

**The Problem:** Cameras that lock their orientation to the player's rotation will cause uncontrollable spinning. This happens because: player rotates → camera rotates to follow → movement direction changes → player rotates again → loop.

**How to Identify:** Check camera scripts for code reading `playerTransform.worldRotation` or `playerTransform.worldForward` to set camera orientation.

**The Fix:** Alter the existing camera controller to remove orientation-locking. Keep position-following logic, but control rotation independently (user input, fixed angles, or orbit controls).

```typescript
// ❌ BEFORE (locks to player orientation)
cameraTransform.worldRotation = Quaternion.lookRotation(playerTransform.worldForward, Vec3.up);

// ✅ AFTER (rotation independent of player)
cameraTransform.worldRotation = this.userControlledRotation;
```

---

## Physics Configuration Explained

| Setting | Value | Why |
|---------|-------|-----|
| `type` | DynamicCollider | Enables physics simulation (gravity, collisions) |
| `lockedRotationAxes` | 7 | Locks X, Y, Z rotation - script controls rotation via transform |
| `angularDamping` | 100000000.0 | Prevents any physics-induced rotation (belt and suspenders with locked axes) |
| `linearDamping` | 1.0 | Slight movement damping for natural feel |
| `mass` | 10.0 | Standard player mass for collision response |
| `useGravity` | true | Player falls when not on ground |

The combination of `lockedRotationAxes: 7` and extremely high `angularDamping` ensures the physics system never rotates the player - only the script's quaternion slerp controls facing direction.

---

## Customization

### Adjusting Movement Speed

Modify `moveSpeed` property on the component:
- Lower values (3-5): Slower, more deliberate movement
- Default (6): Standard third-person speed
- Higher values (8-12): Fast, arcade-style movement

### Adjusting Rotation Speed

Modify `rotationSpeed` property:
- Lower values (360-500): Slow, weighty turning
- Default (1000): Snappy, responsive turning
- Higher values (1500+): Near-instant facing changes

### Changing Collider Size

Adjust capsule collider for different character sizes:
- `radius`: Character width (0.5 = 1 unit diameter)
- `length`: Character height minus caps (1.0 + 2×radius = 2 unit total height)
- `localPosition.y`: Should be half the total capsule height

---

## Troubleshooting

**Player doesn't move:**
- Verify `ThirdPersonControllerInputAligned` component is on player root entity
- Check that script compiled without errors
- Ensure player has `BasePlayerPlatformComponent`

**Player moves in wrong direction relative to camera:**
- Verify camera uses `CameraService.setCameraMode()` to update position/rotation
- Check `CameraService.get().forward` returns expected direction

**Player rotates erratically or physics-induced spinning:**
- Verify `lockedRotationAxes: 7` on PhysicsBodyPlatformComponent
- Verify `angularDamping: 100000000.0`
- Verify `maxAngularVelocity: 0.0`

**Player falls through ground:**
- Verify collider child entity exists with `ColliderCapsulePlatformComponent`
- Verify collider `localPosition.y` is set (~1.0) to center on player
- Verify ground has collision enabled

**Player slides on slopes:**
- Increase `linearDamping` value
- Consider adding ground check and slope handling to script

**Movement feels floaty:**
- Increase `linearDamping` for more grounded feel
- Decrease `moveSpeed` for more deliberate movement

**Player spins uncontrollably or camera/player fight each other:**
- Camera feedback loop - see "Camera Feedback Loop Warning" section
- Fix: Camera must NOT follow player rotation
