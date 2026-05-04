/**
 * VisualEffects.ts — All visual juice systems for the Suika Merge Game.
 *
 * Contains: particle system, screen shake, chain tracking,
 * danger zone shimmer, idle motion helpers, squash/stretch logic.
 * Kept separate from GameRenderer.ts and GameComponent.ts to stay under 1000 lines.
 */
import {
  DrawingCommandsBuilder,
  SolidBrush,
} from 'meta/custom_ui_experimental';
import { Color } from 'meta/platform_api';

import { CONTAINER_LEFT, CONTAINER_RIGHT, DANGER_LINE_Y } from './Constants';
import type { GameItem } from './Types';

// ============================================================
// 1. PARTICLE SYSTEM
// ============================================================

export interface Particle {
  x: number;
  y: number;
  vx: number;        // px/s
  vy: number;        // px/s
  life: number;       // seconds remaining
  maxLife: number;    // seconds total (for alpha calc)
  radius: number;     // px
  r: number;          // red channel 0-1
  g: number;          // green channel 0-1
  b: number;          // blue channel 0-1
}

const MAX_PARTICLES = 100;
let particles: Particle[] = [];

/**
 * Spawn merge particles at a position, colored to match the tier.
 * chainDepth increases particle count and speed.
 */
export function spawnMergeParticles(
  x: number,
  y: number,
  colorHex: string,
  chainDepth: number,
): void {
  const color = Color.fromHex(colorHex);

  // More particles for deeper chains (6 base + 3 per chain level, capped at 18)
  const count = Math.min(6 + chainDepth * 3, 18);
  // Faster particles for deeper chains
  const speedMult = 1.0 + chainDepth * 0.3;

  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) break;

    const angle = Math.random() * Math.PI * 2;
    const speed = (30 + Math.random() * 80) * speedMult;
    const life = 0.3 + Math.random() * 0.4;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40, // Slight upward bias
      life,
      maxLife: life,
      radius: 2 + Math.random() * 3,
      r: color.r,
      g: color.g,
      b: color.b,
    });
  }
}

/**
 * Update all particles. Call each frame with dt.
 */
export function updateParticles(dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 120 * dt; // Gentle gravity on particles
    p.life -= dt;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

/**
 * Draw all active particles.
 */
export function drawParticles(builder: DrawingCommandsBuilder): void {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const alpha = Math.max(0, p.life / p.maxLife);
    const r = p.radius * (0.5 + alpha * 0.5); // Shrink as they fade
    const brush = new SolidBrush(new Color(p.r, p.g, p.b, alpha * 0.85));
    builder.drawEllipse(brush, null, p.x, p.y, r, r);
  }
}

/**
 * Clear all particles (on restart).
 */
export function clearParticles(): void {
  particles = [];
}

// ============================================================
// 2. SCREEN SHAKE
// ============================================================

let shakeIntensity = 0;
const SHAKE_DECAY = 12.0; // Per-second exponential decay

/**
 * Trigger a screen shake. Intensity stacks with existing shake.
 * @param intensity Pixel offset magnitude.
 */
export function triggerShake(intensity: number): void {
  shakeIntensity = Math.max(shakeIntensity, intensity);
}

/**
 * Update shake decay. Call each frame.
 */
export function updateShake(dt: number): void {
  shakeIntensity *= Math.exp(-SHAKE_DECAY * dt);
  if (shakeIntensity < 0.15) {
    shakeIntensity = 0;
  }
}

/**
 * Get the current shake offset for pushTranslate.
 * Returns {x, y} in pixels.
 */
export function getShakeOffset(): { x: number; y: number } {
  if (shakeIntensity === 0) return { x: 0, y: 0 };
  return {
    x: (Math.random() - 0.5) * shakeIntensity * 2,
    y: (Math.random() - 0.5) * shakeIntensity * 2,
  };
}

/**
 * Reset shake (on restart).
 */
export function resetShake(): void {
  shakeIntensity = 0;
}

// ============================================================
// 3. CHAIN TRACKING
// ============================================================

let lastMergeTime = 0;
let chainDepth = 0;
const CHAIN_WINDOW = 0.4; // Seconds — merges within this window count as a chain

/**
 * Register a merge event. Call on each merge.
 * @param currentTime Seconds (use accumulated time or WorldService.get().getWorldTime())
 */
export function registerMerge(currentTime: number): void {
  if (currentTime - lastMergeTime < CHAIN_WINDOW) {
    chainDepth++;
  } else {
    chainDepth = 1;
  }
  lastMergeTime = currentTime;
}

/**
 * Update chain — reset if window has elapsed.
 */
export function updateChain(currentTime: number): void {
  if (chainDepth > 0 && currentTime - lastMergeTime > CHAIN_WINDOW) {
    chainDepth = 0;
  }
}

/**
 * Get current chain depth (0 = no active chain, 1 = single merge, 2+ = chain).
 */
export function getChainDepth(): number {
  return chainDepth;
}

/**
 * Reset chain tracking (on restart).
 */
export function resetChain(): void {
  chainDepth = 0;
  lastMergeTime = 0;
}

// ============================================================
// 4. DANGER ZONE SHIMMER
// ============================================================

let dangerAmount = 0; // 0 to 1 — how "in danger" items are

/**
 * Update danger shimmer based on whether items are near the danger line.
 * Smoothly fades in/out.
 */
export function updateDangerShimmer(items: GameItem[], dt: number): void {
  let anyInDanger = false;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.y - item.radius < DANGER_LINE_Y + 20 && item.vy < 50 && item.mergeCooldown <= 0) {
      anyInDanger = true;
      break;
    }
  }

  const target = anyInDanger ? 1.0 : 0.0;
  const speed = anyInDanger ? 3.0 : 5.0; // Fade in slower, fade out faster
  dangerAmount += (target - dangerAmount) * (1 - Math.exp(-speed * dt));

  if (dangerAmount < 0.01) dangerAmount = 0;
  if (dangerAmount > 0.99) dangerAmount = 1;
}

/**
 * Draw danger shimmer overlay — pulsing red semi-transparent bar at danger line.
 * @param frameCount Used for pulse animation.
 */
export function drawDangerShimmer(
  builder: DrawingCommandsBuilder,
  frameCount: number,
): void {
  if (dangerAmount <= 0) return;

  const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.08);
  const alpha = dangerAmount * (0.08 + 0.07 * pulse);

  const shimmerBrush = new SolidBrush(new Color(1, 0.15, 0.2, alpha));
  // Draw a gradient-like band from top of container to danger line
  const bandTop = DANGER_LINE_Y - 30;
  const bandBottom = DANGER_LINE_Y + 10;
  builder.drawRect(shimmerBrush, null, {
    x: CONTAINER_LEFT,
    y: bandTop,
    width: CONTAINER_RIGHT - CONTAINER_LEFT,
    height: bandBottom - bandTop,
  });
}

/**
 * Get the current danger amount (0–1).
 * 0 = no items near danger line, 1 = items in danger zone.
 */
export function getDangerAmount(): number {
  return dangerAmount;
}

/**
 * Reset danger shimmer (on restart).
 */
export function resetDangerShimmer(): void {
  dangerAmount = 0;
}

// ============================================================
// 5. SQUASH & STRETCH (Spring-Based)
// ============================================================

const SQUASH_LAND_X = 1.30;   // How wide item gets on landing (was 1.15)
const SQUASH_LAND_Y = 0.70;   // How short item gets on landing (was 0.85)
const SQUASH_MERGE_X = 0.7;   // Narrow on merge spawn (was 0.8)
const SQUASH_MERGE_Y = 1.35;  // Tall on merge spawn (was 1.2)
const SQUASH_COLLISION_X = 1.20; // Sideways squash from collision
const SQUASH_COLLISION_Y = 0.80; // Vertical squash from collision
const LANDING_VY_THRESHOLD = 100; // Minimum vy to trigger squash on landing

// Spring parameters for squash recovery
const SQUASH_SPRING_K = 180;      // Spring stiffness (force toward 1.0)
const SQUASH_SPRING_DAMP = 12;    // Damping coefficient

/**
 * Detect landing (vy was positive, now is 0 or negative) and trigger squash.
 * Call each physics frame BEFORE updating prevVy.
 */
export function detectLanding(item: GameItem): void {
  // prevVy was moving down, vy has decreased significantly → impact
  if (item.prevVy > LANDING_VY_THRESHOLD && Math.abs(item.vy) < item.prevVy * 0.5) {
    const intensity = Math.min(item.prevVy / 600, 1.0); // Normalize 0-1
    const targetX = 1.0 + (SQUASH_LAND_X - 1.0) * intensity;
    const targetY = 1.0 + (SQUASH_LAND_Y - 1.0) * intensity;
    item.squashX = targetX;
    item.squashY = targetY;
    // Give initial velocity kick for overshoot
    item.squashVelX = (targetX - 1.0) * -30;
    item.squashVelY = (targetY - 1.0) * -30;
  }
}

/**
 * Apply merge-spawn stretch to a newly created merged item.
 */
export function applyMergeStretch(item: GameItem): void {
  item.squashX = SQUASH_MERGE_X;
  item.squashY = SQUASH_MERGE_Y;
  // Kick velocity for overshoot bounce
  item.squashVelX = (SQUASH_MERGE_X - 1.0) * -25;
  item.squashVelY = (SQUASH_MERGE_Y - 1.0) * -25;
}

/**
 * Apply collision-triggered squash proportional to impact intensity.
 * @param item The item that was hit.
 * @param intensity Normalized impact strength (0–1).
 */
export function applyCollisionSquash(item: GameItem, intensity: number): void {
  if (item.merging) return;
  const clamped = Math.min(intensity, 1.0);
  const targetX = 1.0 + (SQUASH_COLLISION_X - 1.0) * clamped;
  const targetY = 1.0 + (SQUASH_COLLISION_Y - 1.0) * clamped;
  // Only apply if this squash is stronger than current deformation
  if (Math.abs(targetX - 1.0) > Math.abs(item.squashX - 1.0) * 0.5) {
    item.squashX = targetX;
    item.squashY = targetY;
    item.squashVelX = (targetX - 1.0) * -20;
    item.squashVelY = (targetY - 1.0) * -20;
  }
}

/**
 * Update squash/stretch using damped spring physics toward 1.0 for all items.
 * Produces springy overshoot instead of plain exponential decay.
 */
export function updateSquashStretch(items: GameItem[], dt: number): void {
  const dampFactor = Math.exp(-SQUASH_SPRING_DAMP * dt);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.squashX === 1.0 && item.squashY === 1.0 &&
        Math.abs(item.squashVelX) < 0.01 && Math.abs(item.squashVelY) < 0.01) {
      continue; // Already at rest
    }

    // Spring force toward equilibrium (1.0)
    const forceX = (1.0 - item.squashX) * SQUASH_SPRING_K;
    const forceY = (1.0 - item.squashY) * SQUASH_SPRING_K;

    // Apply force and damping to velocity
    item.squashVelX = (item.squashVelX + forceX * dt) * dampFactor;
    item.squashVelY = (item.squashVelY + forceY * dt) * dampFactor;

    // Integrate position
    item.squashX += item.squashVelX * dt;
    item.squashY += item.squashVelY * dt;

    // Snap to rest when settled
    if (Math.abs(item.squashX - 1.0) < 0.005 && Math.abs(item.squashVelX) < 0.1) {
      item.squashX = 1.0;
      item.squashVelX = 0;
    }
    if (Math.abs(item.squashY - 1.0) < 0.005 && Math.abs(item.squashVelY) < 0.1) {
      item.squashY = 1.0;
      item.squashVelY = 0;
    }
  }
}

// ============================================================
// 6. IDLE MOTION
// ============================================================

const IDLE_SCALE_AMP = 0.015;   // ±1.5% scale pulse
const IDLE_SCALE_FREQ = 1.5;    // Hz
const IDLE_VY_THRESHOLD = 5;    // Max vy to be considered "at rest"
const IDLE_VX_THRESHOLD = 5;    // Max vx to be considered "at rest"

/**
 * Calculate idle scale multiplier for an item at rest.
 * Returns 1.0 if item is moving, or a gentle sine pulse if settled.
 * @param time Accumulated time in seconds.
 */
export function getIdleScale(item: GameItem, time: number): number {
  if (Math.abs(item.vy) > IDLE_VY_THRESHOLD || Math.abs(item.vx) > IDLE_VX_THRESHOLD) {
    return 1.0;
  }
  return 1.0 + IDLE_SCALE_AMP * Math.sin(time * IDLE_SCALE_FREQ * Math.PI * 2 + item.idlePhase);
}

// ============================================================
// 7. MASTER RESET
// ============================================================

/**
 * Reset ALL visual effects. Call on game restart.
 */
export function resetAllEffects(): void {
  clearParticles();
  resetShake();
  resetChain();
  resetDangerShimmer();
}
