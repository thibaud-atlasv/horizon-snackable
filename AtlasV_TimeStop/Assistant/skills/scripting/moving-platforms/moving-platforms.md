---
name: moving-platforms
summary: Platform system for carrying entities between two points. Handles entity attachment, squish prevention, and push-off mechanics.
include: as_needed
---

# Moving Platforms

Platforms that carry entities while moving between two points.

> **⚠️ CRITICAL: Trigger + DynamicCollider Required**
> - Platform ROOT must have `PhysicsBodyType.Trigger`
> - Stepping entity (player) MUST have `PhysicsBodyType.DynamicCollider`
> - Without both, `OnTriggerEnterEvent` will NOT fire

| File | Purpose |
|------|---------|
| `MovingPlatform.ts.skill` | Base platform with entity attachment and linear movement |

---

## Setup

### Step 1: Copy Base Script

Use `copy_local_file`:

| Source | Destination |
|--------|-------------|
| `{{#CONTEXT_PATH}}/MovingPlatform.ts.skill` | `scripts/Platforms/MovingPlatform.ts` |

### Step 2: Create Platform Script

Extend `MovingPlatform` and configure movement:

```typescript
import { component, property, Vec3 } from 'meta/worlds';
import { MovingPlatform } from './MovingPlatform';

@component()
export class Elevator extends MovingPlatform {
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `speed` | `number` | `2` | Units per second |
| `pointA` | `Vec3` | `(0,0,0)` | Start position (local space) |
| `pointB` | `Vec3` | `(0,5,0)` | End position (local space) |
| `pauseAtEndpoints` | `number` | `0` | Pause seconds at each end |
| `enableSquishDetection` | `boolean` | `true` | Check for crushing |

### Step 3: Create Platform Template

1. `template_gameplay_object` with:
   - `physics_body_type` = `"Trigger"` (REQUIRED)
   - `use_gravity` = `false`

2. Add child entity with `PhysicsBodyType.Static` + `ColliderBoxComponent` for solid surface

**Structure:**
```
Platform (root)
├── MovingPlatform component
├── PhysicsBodyComponent (Trigger)     ← detection
├── ColliderBoxComponent
└── SolidSurface (child)
    ├── Visuals (shape or mesh)
    ├── PhysicsBodyComponent (Static)  ← solid surface
    └── ColliderBoxComponent (SAME SIZE AS VISUALS)
```

Make the trigger have half-extent thickness 0.05. This means the top of the visual solid surface needs to be at -0.05. Place SolidSurface at -0.05 - SolidSurface's half-extent thickness.

### Step 4: Verify & Place

1. `wait_for_asset_build` with `directoryPaths` = `scripts/Platforms/`
2. Place template in scene, configure `pointA`/`pointB` in local space

---

## Overrideable Methods

| Method | Purpose | Default |
|--------|---------|---------|
| `isRideable(entity)` | Filter which entities can ride | Returns `true` |
| `onEntityStepOn(entity)` | Called when entity steps on | Empty |
| `onEntityStepOff(entity)` | Called when entity steps off | Empty |
| `onReachedEndpoint(endpoint)` | Called at each endpoint | Empty |
| `detectSquish(entity, delta)` | Check if entity is crushed | Returns `false` |
| `handleSquish(entity, delta)` | Handle crush event | Push to safety, detach |

---

## Squish Prevention

Override `detectSquish()` and `handleSquish()` for custom behavior:

```typescript
// Kill on squish
protected override handleSquish(entity: Entity, platformDelta: Vec3): boolean {
  entity.getComponent(HealthComponent)?.die();
  return true; // detach
}
```

See [`{{#CONTEXT_PATH}}/Docs/squish-prevention.md`]({{#CONTEXT_PATH}}/Docs/squish-prevention.md) for algorithms.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Trigger not firing | ROOT must be `Trigger`; player must be `DynamicCollider`; use primitive colliders |
| Entity doesn't follow | Check `OnTriggerEnterEvent` fires; verify velocity sync runs each frame |
| Entity slides off | Reduce speed; check no conflicting physics forces |
| Entity crushed | Implement `detectSquish()`/`handleSquish()` |
| Platform doesn't move | Check `speed > 0`; verify `pointA ≠ pointB` |
| Multiplayer desync | Use `NetworkMode.Networked`; platform server-authoritative |
