/**
 * Physics.ts — 2D circle physics engine for the Suika Merge Game.
 *
 * All operations are frame-rate independent (take dt parameter).
 * Handles: gravity integration, circle-circle collision response with spin,
 * circle-wall collision with angular velocity, velocity damping, angular damping.
 */
import {
  GRAVITY,
  RESTITUTION,
  WALL_RESTITUTION,
  FRICTION_DAMPING,
  ANGULAR_FRICTION_DAMPING,
  MAX_VELOCITY,
  MAX_ANGULAR_VELOCITY,
  POSITION_CORRECTION,
  SPIN_TRANSFER,
  CONTAINER_LEFT,
  CONTAINER_RIGHT,
  CONTAINER_BOTTOM,
} from './Constants';
import type { GameItem } from './Types';

/** Collision impact info for triggering squash effects */
export interface CollisionImpact {
  itemIndex: number;
  intensity: number; // Normalized 0–1
}

/**
 * Apply gravity to all items' velocities.
 * Skips items flagged as merging.
 */
export function applyGravity(items: GameItem[], dt: number): void {
  const dv = GRAVITY * dt;
  for (let i = 0; i < items.length; i++) {
    if (items[i].merging) continue;
    items[i].vy += dv;
  }
}

/**
 * Integrate positions from velocities and angles from angular velocity.
 * Skips items flagged as merging.
 */
export function integratePositions(items: GameItem[], dt: number): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.merging) continue;
    item.x += item.vx * dt;
    item.y += item.vy * dt;
    item.angle += item.angularVelocity * dt;
  }
}

// Rest-state angular damping thresholds
const REST_LINEAR_SPEED_SQ = 50 * 50;       // Below 50 px/s linear speed → blend toward rest damping
const REST_ANGULAR_DAMPING = 25.0;           // Aggressive angular damping for fully at-rest items
const ANGULAR_SNAP_THRESHOLD = 0.03;         // Snap angular velocity to zero below this

/**
 * Apply velocity damping (exponential decay) and angular damping.
 * Uses smooth interpolation between normal and rest angular damping based
 * on linear speed — the slower an item moves, the faster its spin decays.
 * This prevents items in stacks from freely spinning due to micro-oscillations.
 */
export function applyDamping(items: GameItem[], dt: number): void {
  const linearFactor = Math.exp(-FRICTION_DAMPING * dt);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    item.vx *= linearFactor;
    item.vy *= linearFactor;

    // Smooth angular damping: blend between normal and rest damping
    // restFactor is 1.0 when perfectly still, 0.0 when at/above threshold
    const speedSq = item.vx * item.vx + item.vy * item.vy;
    const restFactor = 1.0 - Math.min(Math.max(speedSq / REST_LINEAR_SPEED_SQ, 0), 1);
    const effectiveDamping = ANGULAR_FRICTION_DAMPING + restFactor * (REST_ANGULAR_DAMPING - ANGULAR_FRICTION_DAMPING);
    item.angularVelocity *= Math.exp(-effectiveDamping * dt);

    // Snap to zero when angular velocity is negligible
    if (Math.abs(item.angularVelocity) < ANGULAR_SNAP_THRESHOLD) {
      item.angularVelocity = 0;
    }
  }
}

/**
 * Clamp all velocities and angular velocities.
 */
export function clampVelocities(items: GameItem[]): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const speedSq = item.vx * item.vx + item.vy * item.vy;
    if (speedSq > MAX_VELOCITY * MAX_VELOCITY) {
      const speed = Math.sqrt(speedSq);
      const scale = MAX_VELOCITY / speed;
      item.vx *= scale;
      item.vy *= scale;
    }
    // Clamp angular velocity
    if (item.angularVelocity > MAX_ANGULAR_VELOCITY) {
      item.angularVelocity = MAX_ANGULAR_VELOCITY;
    } else if (item.angularVelocity < -MAX_ANGULAR_VELOCITY) {
      item.angularVelocity = -MAX_ANGULAR_VELOCITY;
    }
  }
}

/**
 * Resolve circle-wall collisions (left, right, bottom walls).
 * Items are pushed inside and velocity is reflected with restitution.
 * Wall hits also impart angular velocity based on tangential velocity.
 */
export function resolveWallCollisions(items: GameItem[]): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const r = item.radius;

    // Left wall
    const leftBound = CONTAINER_LEFT + r;
    if (item.x < leftBound) {
      item.x = leftBound;
      item.vx = Math.abs(item.vx) * WALL_RESTITUTION;
      // Wall contact: tangential velocity is vy, imparts spin
      item.angularVelocity += (item.vy * SPIN_TRANSFER) / r;
    }

    // Right wall
    const rightBound = CONTAINER_RIGHT - r;
    if (item.x > rightBound) {
      item.x = rightBound;
      item.vx = -Math.abs(item.vx) * WALL_RESTITUTION;
      // Wall contact: tangential velocity is -vy (reversed for right wall)
      item.angularVelocity -= (item.vy * SPIN_TRANSFER) / r;
    }

    // Bottom wall
    const bottomBound = CONTAINER_BOTTOM - r;
    if (item.y > bottomBound) {
      item.y = bottomBound;
      item.vy = -Math.abs(item.vy) * WALL_RESTITUTION;
      // Bottom contact: tangential velocity is vx, imparts spin
      item.angularVelocity -= (item.vx * SPIN_TRANSFER) / r;
    }
  }
}

/**
 * Detect and resolve circle-circle collisions with angular velocity transfer.
 * Uses position correction and elastic velocity response.
 * Returns pairs of colliding same-tier items for merge detection,
 * and collision impact data for squash effects.
 * Skips items flagged as merging.
 */
export function resolveCircleCollisions(items: GameItem[]): { mergePairs: Array<[number, number]>; impacts: CollisionImpact[] } {
  const mergePairs: Array<[number, number]> = [];
  const impacts: CollisionImpact[] = [];
  const IMPACT_VEL_THRESHOLD = 80; // Min relative velocity to trigger squash
  const IMPACT_VEL_MAX = 500;      // Velocity for max intensity

  for (let i = 0; i < items.length; i++) {
    if (items[i].merging) continue;
    for (let j = i + 1; j < items.length; j++) {
      if (items[j].merging) continue;

      const a = items[i];
      const b = items[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = dx * dx + dy * dy;
      const minDist = a.radius + b.radius;

      if (distSq < minDist * minDist && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;

        // Normal from a to b
        const nx = dx / dist;
        const ny = dy / dist;

        // Tangent (perpendicular to normal, 90° CCW)
        const tx = -ny;
        const ty = nx;

        // Position correction — push apart proportionally to mass (radius²)
        const massA = a.radius * a.radius;
        const massB = b.radius * b.radius;
        const totalMass = massA + massB;
        const correctionAmount = overlap * POSITION_CORRECTION;

        a.x -= nx * correctionAmount * (massB / totalMass);
        a.y -= ny * correctionAmount * (massB / totalMass);
        b.x += nx * correctionAmount * (massA / totalMass);
        b.y += ny * correctionAmount * (massA / totalMass);

        // Relative velocity along collision normal
        const dvx = a.vx - b.vx;
        const dvy = a.vy - b.vy;
        const relVelNormal = dvx * nx + dvy * ny;

        // Only resolve if moving toward each other
        if (relVelNormal > 0) {
          const impulse = relVelNormal * (1 + RESTITUTION) / totalMass;

          a.vx -= impulse * massB * nx;
          a.vy -= impulse * massB * ny;
          b.vx += impulse * massA * nx;
          b.vy += impulse * massA * ny;

          // Tangential component of relative velocity (drives angular velocity)
          const relVelTangent = dvx * tx + dvy * ty;

          // Transfer tangential impulse into angular velocity
          const spinImpulseA = relVelTangent * SPIN_TRANSFER / a.radius;
          const spinImpulseB = relVelTangent * SPIN_TRANSFER / b.radius;

          a.angularVelocity += spinImpulseA * (massB / totalMass);
          b.angularVelocity -= spinImpulseB * (massA / totalMass);

          // Generate collision impact for squash effects
          if (relVelNormal > IMPACT_VEL_THRESHOLD) {
            const intensity = Math.min((relVelNormal - IMPACT_VEL_THRESHOLD) / (IMPACT_VEL_MAX - IMPACT_VEL_THRESHOLD), 1.0);
            impacts.push({ itemIndex: i, intensity });
            impacts.push({ itemIndex: j, intensity });
          }
        }

        // Anti-stacking nudge: subtle random horizontal push to prevent perfect vertical stacks
        const nudge = (Math.random() - 0.5) * 6; // ±3 px/s average
        a.vx += nudge;
        b.vx -= nudge;

        // Track same-tier pairs for merge
        if (a.tier === b.tier && a.mergeCooldown <= 0 && b.mergeCooldown <= 0) {
          mergePairs.push([i, j]);
        }
      }
    }
  }

  return { mergePairs, impacts };
}

/**
 * Run a full physics step.
 */
export function physicsStep(items: GameItem[], dt: number): { mergePairs: Array<[number, number]>; impacts: CollisionImpact[] } {
  applyGravity(items, dt);
  integratePositions(items, dt);
  applyDamping(items, dt);
  resolveWallCollisions(items);
  const result = resolveCircleCollisions(items);
  clampVelocities(items);
  return result;
}
