# Squish Prevention Deep Dive

This document covers advanced squish detection and prevention strategies for moving platforms.

---

## Understanding Squish

Squish occurs when a platform moves an entity into geometry (walls, ceilings, floors) with no escape path. This results in:
- Entity getting stuck inside collision geometry
- Physics system fighting to resolve interpenetration
- Jittering, teleportation, or complete physics breakdown
- Frustrating player experience

### When Squish Occurs

| Scenario | Platform Movement | Obstacle |
|----------|-------------------|----------|
| Ceiling crush | Upward (elevator) | Ceiling/overhang |
| Wall crush | Horizontal | Wall/pillar |
| Floor crush | Downward | Floor (rare, usually entity falls off) |
| Corner crush | Diagonal | Corner geometry |

---

## Detection Algorithms

### Algorithm 1: Raycast Ahead

Cast a ray from the entity in the platform's movement direction to detect obstacles before collision.

```typescript
private detectSquishWithRaycast(
  entity: Entity,
  platformVelocity: Vec3,
  deltaTime: number
): SquishResult {
  const transform = entity.getComponent(TransformComponent);
  if (!transform) return { willSquish: false };

  // Calculate how far the platform will move this frame
  const movementThisFrame = platformVelocity.mul(deltaTime);
  const movementDirection = platformVelocity.normalized();

  // Add buffer distance to catch squish before it happens
  const checkDistance = movementThisFrame.magnitude() + this.entityRadius + this.squishBuffer;

  // Raycast from entity center in movement direction
  const ray = new Ray(transform.position, movementDirection);
  const hit = Physics.raycast(ray, checkDistance, this.obstacleLayerMask);

  if (hit && hit.entity !== this.entity) {
    // Calculate available space
    const availableSpace = hit.distance - this.entityRadius;
    const requiredSpace = movementThisFrame.magnitude();

    return {
      willSquish: availableSpace < requiredSpace,
      obstacle: hit.entity,
      impactPoint: hit.point,
      availableSpace,
      escapeDirection: this.calculateEscapeDirection(movementDirection, hit.normal),
    };
  }

  return { willSquish: false };
}

interface SquishResult {
  willSquish: boolean;
  obstacle?: Entity;
  impactPoint?: Vec3;
  availableSpace?: number;
  escapeDirection?: Vec3;
}
```

### Algorithm 2: Overlap Test

Check if the entity would overlap with geometry at the next position.

```typescript
private detectSquishWithOverlap(
  entity: Entity,
  platformDelta: Vec3
): SquishResult {
  const transform = entity.getComponent(TransformComponent);
  if (!transform) return { willSquish: false };

  // Calculate where entity would be after platform moves
  const futurePosition = transform.position.add(platformDelta);

  // Perform overlap test at future position
  const overlaps = Physics.overlapSphere(
    futurePosition,
    this.entityRadius,
    this.obstacleLayerMask
  );

  // Filter out the platform itself and the entity
  const obstacles = overlaps.filter(
    (e) => e !== this.entity && e !== entity
  );

  if (obstacles.length > 0) {
    return {
      willSquish: true,
      obstacle: obstacles[0],
      escapeDirection: this.findBestEscapeDirection(transform.position, obstacles),
    };
  }

  return { willSquish: false };
}
```

### Algorithm 3: Continuous Collision Detection

For fast-moving platforms, use swept collision to detect squish along the entire movement path.

```typescript
private detectSquishWithSweep(
  entity: Entity,
  platformStart: Vec3,
  platformEnd: Vec3
): SquishResult {
  const transform = entity.getComponent(TransformComponent);
  if (!transform) return { willSquish: false };

  // Swept sphere test from current to future position
  const entityStart = transform.position;
  const entityEnd = transform.position.add(platformEnd.sub(platformStart));

  const hit = Physics.sweepSphere(
    entityStart,
    entityEnd,
    this.entityRadius,
    this.obstacleLayerMask
  );

  if (hit && hit.entity !== this.entity) {
    const collisionTime = hit.time; // 0-1, when during movement collision occurs

    return {
      willSquish: true,
      obstacle: hit.entity,
      impactPoint: hit.point,
      collisionTime,
      escapeDirection: hit.normal,
    };
  }

  return { willSquish: false };
}
```

---

## Escape Direction Calculation

When squish is detected, calculate the best direction to push the entity to safety.

### Perpendicular Escape

Push perpendicular to platform movement (simplest approach).

```typescript
private calculatePerpendicularEscape(movementDirection: Vec3): Vec3 {
  // Get perpendicular direction in horizontal plane
  const perpendicular = new Vec3(
    -movementDirection.z,
    0,
    movementDirection.x
  ).normalized();

  return perpendicular;
}
```

### Obstacle Normal Escape

Push away from the obstacle using its surface normal.

```typescript
private calculateNormalEscape(
  movementDirection: Vec3,
  obstacleNormal: Vec3
): Vec3 {
  // Reflect movement direction off obstacle normal
  const dot = movementDirection.dot(obstacleNormal);
  const reflected = movementDirection.sub(obstacleNormal.mul(2 * dot));

  return reflected.normalized();
}
```

### Best Available Space Escape

Find the direction with the most available space.

```typescript
private findBestEscapeDirection(
  entityPosition: Vec3,
  obstacles: Entity[]
): Vec3 {
  const testDirections = [
    new Vec3(1, 0, 0),
    new Vec3(-1, 0, 0),
    new Vec3(0, 0, 1),
    new Vec3(0, 0, -1),
    new Vec3(0.707, 0, 0.707),
    new Vec3(-0.707, 0, 0.707),
    new Vec3(0.707, 0, -0.707),
    new Vec3(-0.707, 0, -0.707),
  ];

  let bestDirection = testDirections[0];
  let bestDistance = 0;

  for (const dir of testDirections) {
    const ray = new Ray(entityPosition, dir);
    const hit = Physics.raycast(ray, 10, this.obstacleLayerMask);

    const distance = hit ? hit.distance : 10;
    if (distance > bestDistance) {
      bestDistance = distance;
      bestDirection = dir;
    }
  }

  return bestDirection;
}
```

---

## Response Strategies

### Strategy A: Gradual Push

Push entity over multiple frames to avoid jarring movement.

```typescript
private gradualPushToSafety(
  entity: Entity,
  escapeDirection: Vec3,
  targetDistance: number
): void {
  // Track push progress
  if (!this.pushProgress.has(entity)) {
    this.pushProgress.set(entity, {
      direction: escapeDirection,
      remaining: targetDistance,
    });
  }

  const progress = this.pushProgress.get(entity)!;
  const pushThisFrame = Math.min(progress.remaining, this.pushSpeed * deltaTime);

  const transform = entity.getComponent(TransformComponent);
  if (transform) {
    transform.position = transform.position.add(
      progress.direction.mul(pushThisFrame)
    );
    progress.remaining -= pushThisFrame;
  }

  if (progress.remaining <= 0) {
    this.pushProgress.delete(entity);
    this.detachEntity(entity);
  }
}
```

### Strategy B: Instant Teleport

Immediately move entity to safe position (use for dangerous situations).

```typescript
private teleportToSafety(entity: Entity, escapeDirection: Vec3): void {
  const transform = entity.getComponent(TransformComponent);
  if (!transform) return;

  // Find safe position with raycast
  const ray = new Ray(transform.position, escapeDirection);
  const hit = Physics.raycast(ray, 20, this.obstacleLayerMask);

  const safeDistance = hit ? hit.distance - this.entityRadius - 0.1 : 5;
  const safePosition = transform.position.add(escapeDirection.mul(safeDistance));

  transform.position = safePosition;
  this.detachEntity(entity);
}
```

### Strategy C: Damage and Detach

Deal damage when squish occurs, then detach entity.

```typescript
private handleSquishDamage(entity: Entity): void {
  const health = entity.getComponent(HealthComponent);

  if (this.squishBehavior === SquishBehavior.InstantKill) {
    health?.die();
  } else if (this.squishBehavior === SquishBehavior.Damage) {
    health?.takeDamage(this.squishDamage);
  }

  // Always detach after squish
  this.detachEntity(entity);
}
```

---

## Edge Cases

### Multiple Obstacles

Entity could be squished between platform and multiple obstacles.

```typescript
private handleMultipleObstacles(
  entity: Entity,
  obstacles: Entity[]
): void {
  // If surrounded, prioritize vertical escape
  const transform = entity.getComponent(TransformComponent);
  if (!transform) return;

  // Try upward first
  const upRay = new Ray(transform.position, Vec3.UP);
  const upHit = Physics.raycast(upRay, 10, this.obstacleLayerMask);

  if (!upHit || upHit.distance > this.entityRadius + 1) {
    transform.position = transform.position.add(Vec3.UP.mul(2));
    this.detachEntity(entity);
    return;
  }

  // If no escape, teleport to platform start position
  transform.position = this.pointA;
  this.detachEntity(entity);
}
```

### Squish During Pause

Entity might get squished while platform is paused at endpoint (another entity pushes them).

```typescript
@subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
onUpdate(params: OnWorldUpdateEventPayload) {
  // Always check for squish, even when not moving
  for (const entity of this.ridingEntities) {
    const squish = this.detectSquishWithOverlap(entity, Vec3.ZERO);
    if (squish.willSquish) {
      this.handleSquish(entity, squish);
    }
  }

  // Normal movement logic...
}
```

### Fast Platform Recovery

If platform reverses direction, entity might still be in squish zone.

```typescript
private onDirectionChange(): void {
  // Re-check all riding entities for squish in new direction
  for (const entity of this.ridingEntities) {
    const squish = this.detectSquishWithRaycast(
      entity,
      this.currentVelocity,
      0.5 // Look ahead half second
    );

    if (squish.willSquish) {
      // Preemptively push to safety
      this.pushEntityToSafety(entity, squish.escapeDirection!);
    }
  }
}
```

---

## Configuration Options

```typescript
// Squish detection configuration
@property()
squishDetectionMethod: SquishDetection = SquishDetection.Raycast;

@property()
squishBuffer: number = 0.2; // Extra space to trigger early detection

@property()
entityRadius: number = 0.5; // Assumed entity collision radius

@property()
squishBehavior: SquishBehavior = SquishBehavior.PushToSafety;

@property()
squishDamage: number = 100; // Damage when squished (if using Damage behavior)

@property()
pushSpeed: number = 10; // Units per second for gradual push

enum SquishDetection {
  Raycast,
  Overlap,
  Sweep,
}

enum SquishBehavior {
  PushToSafety,
  InstantKill,
  Damage,
  StopPlatform,
}
```
