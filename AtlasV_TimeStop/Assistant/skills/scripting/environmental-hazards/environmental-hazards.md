---
name: environmental-hazards
summary: Hazard system for spawning moving dangers (cars, trains, swinging axes) and static kill zones (death pits, lava, spikes). Use for any trigger-based hazard. Supports instant-kill and damage-over-time.
include: as_needed
---

# Environmental Hazards (Kill Volumes)

Kill volumes are trigger zones that instantly kill entities when they enter. This is the foundation for all environmental hazards—static or moving. Once you understand kill volumes, you can extend them into:
- **Static hazards:** Death pits, lava pools, spike traps
- **Moving hazards:** Cars, trains, swinging axes, rolling boulders
- **Damage-over-time hazards:** Electric fields, poison zones

> **⚠️ CRITICAL: Trigger Physics Required**
> Kill volumes must use `PhysicsBodyType.Trigger` to detect entities entering the zone. Without this, the `onTriggerEnter` event will not fire. This applies to both static AND moving kill volumes.

| File | Purpose |
|------|---------|
| `KillVolume.ts.skill` | Base kill volume component with trigger detection (requires subclass to implement kill logic) |

---

## Key Rules

- **Trigger Physics Required:** Kill volumes must use `PhysicsBodyType.Trigger` for entity detection
- **Primitive Colliders Only:** Triggers require sphere/box/capsule colliders, not mesh colliders
- **Kill Integration Required:** Subclasses MUST override `isValidTarget()` and `killEntity()` to integrate with your game's health system
- **NetworkMode.Networked:** Use for multiplayer visibility; kill logic is processed by the entity owner
- **Moving Kill Volumes:** The base `KillVolume` class works for both static and moving hazards—trigger detection works regardless of whether the kill volume or the player is moving

---

## Setup

### Step 1: Copy Base Script

> **⚠️ IMPORTANT**: You **MUST** use `copy_local_file` to copy the skill file. Do NOT attempt to create it from scratch or use any other method. The `.skill` file contains a tested, working implementation that must be copied exactly.

**SKILL_DIR** = `Assistant/skills/scripting/environmental-hazards`

| Source | Destination |
|--------|-------------|
| `${SKILL_DIR}/KillVolume.ts.skill` | `scripts/Hazards/KillVolume.ts` |

### Step 2: Create Kill Volume Script

Create a new script that extends the base `KillVolume` class and implements the kill logic.

#### Step 2.1: Create the Script File

Create a new file (e.g., `scripts/Hazards/DeathPit.ts`) that extends `KillVolume`:

```typescript
import { component } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { KillVolume } from './KillVolume';

@component()
export class DeathPit extends KillVolume {
  // === REQUIRED OVERRIDES - Integrate with your health system ===

  protected override isValidTarget(entity: Entity): boolean {
    // TODO: Return true if entity can be killed
    // Example: return entity.getComponent(HealthComponent) !== null;
    return true;
  }

  protected override killEntity(entity: Entity): void {
    // TODO: Kill the entity using your game's death system
    // Example: entity.getComponent(HealthComponent)?.die();
    console.log(`DeathPit kills ${entity.name}`);
  }
}
```

#### Step 2.2: Implement Kill Logic

Override these two methods to integrate with your game's health/death system:

| Method | Purpose | Return |
|--------|---------|--------|
| `isValidTarget(entity)` | Check if entity can be killed | `boolean` |
| `killEntity(entity)` | Kill the entity | `void` |

**Example Implementations:**

```typescript
// === Option A: Set health to zero ===
protected override killEntity(entity: Entity): void {
  const health = entity.getComponent(HealthComponent);
  if (health) {
    health.currentHealth = 0;
  }
}

// === Option B: Call a death method ===
protected override killEntity(entity: Entity): void {
  const health = entity.getComponent(HealthComponent);
  health?.die();
}

// === Option C: Destroy the entity directly ===
protected override killEntity(entity: Entity): void {
  entity.destroy();
}
```

### Step 3: Create Kill Volume Template

#### Step 3.1 Gather the Request AssetIDs

1. Use `bulk_get_asset_id` to get the asset IDs for the following assets:
   - The mesh asset you want to use, specify `targetType` as `mesh`
   - The convex collider mesh asset, specify `targetType` as `phys_convex_mesh`

Example:

```text
{
  "requests": [
    {
      "filePath": "Models/MyModel.fbx",
      "targetType": "mesh"
    },
    {
      "filePath": "Models/MyModel.fbx",
      "targetType": "phys_convex_mesh"
    }
  ]
}
```

#### Step 3.2 Create the Template

1. `template_gameplay_object` with:
   - `template_name` = `"DeathPit"` (or your kill volume name)
   - `mesh_asset_id` = your mesh asset ID (optional, can be invisible)
   - `collision_mesh_asset_id` = your mesh asset ID (REQUIRED if mesh_asset_id is specified, optional otherwise)
   - `physics_body_type` = `"Trigger"` (REQUIRED for entity detection)
   - `use_gravity` = `false` (kill volumes are typically static)
   - `scale` = appropriate size for the kill area

### Step 4: Verify Script Compilation

1. `wait_for_asset_build` with:
   - `directoryPaths` = `scripts/Hazards/`
2. If there are any failures, fix the scripts and call `wait_for_asset_build` again to verify compilation.

### Step 5: Run Validation Checklist

- [ ] Scripts compile without errors
- [ ] `isValidTarget()` and `killEntity()` methods are implemented
- [ ] No scripts try to check `PlayerComponent`, this is NOT supported. Use `BasePlayerComponent` instead.

### Step 6: Place in Scene or Integrate into Spawner System

Add the template instance directly to the scene at the desired location in the editor.

For dynamic spawning, see the sections below on moving hazards.

---

## Moving Kill Volumes

For games where hazards move across the screen (cars, trains, logs), you add movement logic to the kill volume. The trigger detection works the same—it fires when the moving kill volume collides with the player.

### Example: Moving Car (Linear Movement)

```typescript
import {
  component,
  property,
  subscribe,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  ExecuteOn,
  TransformComponent,
  Vec3,
} from 'meta/worlds';
import type { Entity, Maybe } from 'meta/worlds';
import { KillVolume } from './KillVolume';

@component()
export class MovingCar extends KillVolume {
  /** Movement speed in units per second */
  @property()
  speed: number = 5;

  /** Direction of movement (normalized) */
  @property()
  direction: Vec3 = new Vec3(1, 0, 0); // Move along X axis

  /** Distance to travel before despawning (0 = never despawn) */
  @property()
  despawnDistance: number = 50;

  private transform: Maybe<TransformComponent> = null;
  private distanceTraveled: number = 0;

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(params: OnWorldUpdateEventPayload) {
    if (!this.transform) {
      this.transform = this.entity.getComponent(TransformComponent);
      if (!this.transform) return;
    }

    // Move the kill volume
    const movement = this.direction.mul(this.speed * params.deltaTime);
    this.transform.position = this.transform.position.add(movement);

    // Track distance for despawning
    this.distanceTraveled += movement.magnitude();
    if (this.despawnDistance > 0 && this.distanceTraveled >= this.despawnDistance) {
      this.entity.destroy();
    }
  }

  protected override isValidTarget(entity: Entity): boolean {
    // TODO: Return true if entity can be killed
    return true;
  }

  protected override killEntity(entity: Entity): void {
    // TODO: Kill the entity using your game's death system
    console.log(`Car hits ${entity.name}`);
  }
}
```

### Important Notes for Moving Kill Volumes

1. **Trigger detection works both ways:** It doesn't matter if the player walks into the hazard or the hazard moves into the player—`onTriggerEnter` fires either way.

2. **Despawn off-screen hazards:** Moving hazards should destroy themselves after traveling a certain distance to avoid memory buildup.

3. **Spawner placement:** Place spawners at the edge of the play area where hazards should enter.

4. **Variable speeds:** Randomize speed slightly between spawns for more natural feel:
   ```typescript
   const speedVariation = 0.8 + Math.random() * 0.4; // 80% to 120% of base speed
   ```

5. **Physics body type:** Moving kill volumes still use `PhysicsBodyType.Trigger`. The movement is handled by updating `TransformComponent.position` directly, not by physics forces.

---

## Extending to Damage-Over-Time Hazards

Once you have a working kill volume, you can extend it into damage-over-time hazards like lava pools, electric traps, or poison zones.

### Example: Lava Pool (Damage Over Time)

```typescript
import {
  component,
  property,
  subscribe,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  OnTriggerExitEvent,
  OnTriggerExitEventPayload,
  ExecuteOn,
} from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { KillVolume } from './KillVolume';

@component()
export class LavaPool extends KillVolume {
  @property()
  damagePerTick: number = 15;

  @property()
  tickInterval: number = 0.3;

  private entitiesInZone: Map<Entity, number> = new Map();

  // Override to deal damage instead of instant kill
  protected override killEntity(entity: Entity): void {
    // Start tracking for damage over time
    this.entitiesInZone.set(entity, this.tickInterval);
    this.applyDamage(entity); // Deal first tick immediately
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(params: OnWorldUpdateEventPayload) {
    for (const [entity, timeRemaining] of this.entitiesInZone) {
      if (entity.isDestroyed()) {
        this.entitiesInZone.delete(entity);
        continue;
      }

      const newTime = timeRemaining - params.deltaTime;
      if (newTime <= 0) {
        this.applyDamage(entity);
        this.entitiesInZone.set(entity, this.tickInterval);
      } else {
        this.entitiesInZone.set(entity, newTime);
      }
    }
  }

  @subscribe(OnTriggerExitEvent, { execution: ExecuteOn.Owner })
  onTriggerExit(payload: OnTriggerExitEventPayload) {
    if (payload.other) {
      this.entitiesInZone.delete(payload.other);
    }
  }

  private applyDamage(entity: Entity): void {
    // TODO: Apply damage using your game's health system
    // Example: entity.getComponent(HealthComponent)?.takeDamage(this.damagePerTick);
    console.log(`Lava deals ${this.damagePerTick} damage to ${entity.name}`);
  }
}
```

---

## Troubleshooting

**Kill volume doesn't detect entities:**

- Verify kill volume has `PhysicsBodyType.Trigger` on root entity
- Verify ColliderComponent exists on Collider child entity
- Verify target entity has a collider component

**Entity not killed:**

- Verify `killEntity()` method is implemented correctly
- Check that `isValidTarget()` returns `true` for the target entity
- Check console for debug messages from the base class

**Kill area wrong size:**

- Adjust Collider child's `ColliderBoxComponent` or `ColliderSphereComponent` dimensions
- Collider size should match the intended kill area

**Entity killed multiple times:**

- The base class tracks killed entities to prevent duplicates
- If entities respawn, call `resetKilledEntities()` to allow them to be killed again

**Moving kill volume doesn't detect player:**

- Trigger detection works the same for moving and static volumes
- Verify the collider moves with the entity (should be a child of the root)
- Check that movement code is running (add console.log to verify)

**Moving hazards pile up / memory issues:**

- Ensure `despawnDistance` is set so hazards destroy themselves off-screen
- Alternatively, use object pooling instead of destroy/spawn

**Hazards spawn but don't move:**

- Verify `OnWorldUpdateEvent` subscription has `execution: ExecuteOn.Owner`
- Check that `TransformComponent` is being retrieved correctly
- Ensure speed property is greater than 0
