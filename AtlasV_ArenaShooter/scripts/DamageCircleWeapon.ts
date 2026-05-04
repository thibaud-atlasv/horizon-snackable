// Arena Vermin — Damage Circle Weapon System (pure logic module)
// Periodic AoE pulse centered on the hero that damages all enemies within blast radius.
// Draws an expanding ring VFX for each pulse.

import type { DrawingCommandsBuilder } from 'meta/worlds';
import { SolidBrush, Pen } from 'meta/worlds';
import { Color } from 'meta/platform_api';
import type { CameraState, EnemyState, DamageCircleState, DamageCirclePulseVFX } from './Types';
import { worldToScreen } from './IsoRenderer';
import {
  DAMAGE_CIRCLE_LEVELS,
  DAMAGE_CIRCLE_RING_DURATION,
  DAMAGE_CIRCLE_RING_COLOR,
  DAMAGE_CIRCLE_RING_GLOW_COLOR,
  DAMAGE_CIRCLE_RING_WIDTH,
  DAMAGE_CIRCLE_RING_GLOW_WIDTH,
  CANVAS_W, CANVAS_H, PIXELS_PER_UNIT,
} from './Constants';

export interface DamageCircleHitResult {
  enemyIndex: number;
  damage: number;
}

/** Initialize damage circle state for the current level. */
export function initDamageCircle(level: number): DamageCircleState {
  return { lastPulseTime: -999 };
}

/** Update damage circle: check pulse cooldown and damage enemies in radius.
 *  Spawns a pulse VFX when a pulse fires. Returns hit results for all enemies hit. */
export function updateDamageCircle(
  state: DamageCircleState,
  heroX: number,
  heroY: number,
  enemies: EnemyState[],
  dt: number,
  level: number,
  gameTime: number,
  pulseVFX: DamageCirclePulseVFX[],
): DamageCircleHitResult[] {
  if (level <= 0) return [];

  const data = DAMAGE_CIRCLE_LEVELS[level - 1];
  const hits: DamageCircleHitResult[] = [];

  // Check pulse cooldown
  if (gameTime - state.lastPulseTime < data.pulseInterval) return hits;

  // Fire a pulse!
  state.lastPulseTime = gameTime;

  // Damage all alive non-spawning enemies within radius
  const radiusSq = data.radius * data.radius;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy.isDead || enemy.isSpawning) continue;
    const dx = enemy.x - heroX;
    const dy = enemy.y - heroY;
    const distSq = dx * dx + dy * dy;
    if (distSq < radiusSq) {
      hits.push({ enemyIndex: i, damage: data.damage });
    }
  }

  // Spawn expanding ring VFX at hero position
  const maxRadiusPx = data.radius * PIXELS_PER_UNIT;
  pulseVFX.push({
    x: heroX,
    y: heroY,
    age: 0,
    maxAge: DAMAGE_CIRCLE_RING_DURATION,
    maxRadius: maxRadiusPx,
  });

  return hits;
}

/** Update pulse VFX ages and remove expired pulses. */
export function updateDamageCirclePulses(
  pulses: DamageCirclePulseVFX[],
  dt: number,
): void {
  for (let i = pulses.length - 1; i >= 0; i--) {
    pulses[i].age += dt;
    if (pulses[i].age >= pulses[i].maxAge) {
      pulses.splice(i, 1);
    }
  }
}

/** Draw expanding ring VFX for all active pulses. */
export function drawDamageCirclePulses(
  builder: DrawingCommandsBuilder,
  pulses: DamageCirclePulseVFX[],
  camera: CameraState,
): void {
  const screenCX = CANVAS_W / 2;
  const screenCY = CANVAS_H / 2;

  for (const pulse of pulses) {
    const progress = pulse.age / pulse.maxAge; // 0 → 1
    const currentRadius = pulse.maxRadius * progress;
    const alpha = 1.0 - progress; // fade out as it expands

    // Convert world position to screen
    const { sx, sy } = worldToScreen(pulse.x, pulse.y);
    const screenX = sx - camera.offsetX + screenCX;
    const screenY = sy - camera.offsetY + screenCY;

    // Cull off-screen (generous margin for large rings)
    const margin = pulse.maxRadius + 20;
    if (screenX < -margin || screenX > CANVAS_W + margin ||
        screenY < -margin || screenY > CANVAS_H + margin) continue;

    // Draw glow ring (wider, behind)
    const glowColor = Color.fromHex(DAMAGE_CIRCLE_RING_GLOW_COLOR);
    const glowBrush = new SolidBrush(new Color(glowColor.r, glowColor.g, glowColor.b, alpha * 0.4));
    const glowPen = new Pen(glowBrush, DAMAGE_CIRCLE_RING_GLOW_WIDTH);
    builder.drawEllipse(null, glowPen, { x: screenX, y: screenY }, { x: currentRadius, y: currentRadius });

    // Draw main ring
    const ringColor = Color.fromHex(DAMAGE_CIRCLE_RING_COLOR);
    const ringBrush = new SolidBrush(new Color(ringColor.r, ringColor.g, ringColor.b, alpha * 0.8));
    const ringPen = new Pen(ringBrush, DAMAGE_CIRCLE_RING_WIDTH);
    builder.drawEllipse(null, ringPen, { x: screenX, y: screenY }, { x: currentRadius, y: currentRadius });
  }
}
