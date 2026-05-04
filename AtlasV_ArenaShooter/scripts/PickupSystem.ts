// Arena Vermin — Pickup System (Milestone 3)
// Manages pickup spawning, lifetime, collection, and DrawingSurface rendering.
// Now uses gem01/gem02 sprite textures instead of procedural vector graphics.

import {
  DrawingCommandsBuilder,
  ImageBrush,
} from 'meta/worlds';

import { PickupType } from './Types';
import type { PickupState, CameraState } from './Types';
import {
  PICKUP_PERSIST_TIME, PICKUP_FLASH_TIME,
  PICKUP_GEM_W, PICKUP_GEM_H, PICKUP_COIN_W, PICKUP_COIN_H,
  PICKUP_HEALTH_W, PICKUP_HEALTH_H,
  PICKUP_GEM_FLOAT_AMP, PICKUP_GEM_FLOAT_PERIOD,
  PICKUP_COIN_SPIN_PERIOD, PICKUP_SPAWN_OFFSET,
  CANVAS_W, CANVAS_H,
  PICKUP_MAGNET_ACCEL, PICKUP_MAGNET_MAX_SPEED,
  PICKUP_MAGNET_SHRINK_DIST, PICKUP_MAGNET_MIN_SCALE,
} from './Constants';
import { worldToScreen } from './IsoRenderer';
import { gem01Texture, gem02Texture, healthHeartTexture } from './Assets';

// Pre-built image brushes for gem sprites
const gem01Brush = new ImageBrush(gem01Texture);
const gem02Brush = new ImageBrush(gem02Texture);
const healthHeartBrush = new ImageBrush(healthHeartTexture);

/** Collection event returned from update */
export interface PickupCollectionEvent {
  type: PickupType;
  worldX: number;
  worldY: number;
}

/**
 * Spawn a pickup at the given world position with slight random offset.
 */
export function spawnPickup(
  pickups: PickupState[],
  worldX: number,
  worldY: number,
  type: PickupType
): void {
  const offsetX = (Math.random() - 0.5) * PICKUP_SPAWN_OFFSET * 2;
  const offsetY = (Math.random() - 0.5) * PICKUP_SPAWN_OFFSET * 2;

  pickups.push({
    x: worldX + offsetX,
    y: worldY + offsetY,
    type,
    age: 0,
    maxAge: PICKUP_PERSIST_TIME,
    flashAge: PICKUP_FLASH_TIME,
    collected: false,
    collectAnimTimer: -1,
    floatPhase: Math.random() * Math.PI * 2,
    magnetSpeed: 0,
    magnetActive: false,
    magnetScale: 1.0,
  });
}

/**
 * Update all pickups. Returns collection events.
 */
export function updatePickups(
  pickups: PickupState[],
  dt: number,
  heroX: number,
  heroY: number,
  collectionRadius: number,
  magnetRadius: number
): PickupCollectionEvent[] {
  const events: PickupCollectionEvent[] = [];

  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];

    if (p.collected) {
      pickups.splice(i, 1);
      continue;
    }

    p.age += dt;

    // Auto-despawn
    if (p.age >= p.maxAge) {
      pickups.splice(i, 1);
      continue;
    }

    // Distance to hero
    let dx = p.x - heroX;
    let dy = p.y - heroY;
    let dist = Math.sqrt(dx * dx + dy * dy);

    // Magnet pull logic
    if (dist < magnetRadius && dist > 0) {
      p.magnetActive = true;

      // Accelerate toward hero
      p.magnetSpeed += PICKUP_MAGNET_ACCEL * dt;
      if (p.magnetSpeed > PICKUP_MAGNET_MAX_SPEED) {
        p.magnetSpeed = PICKUP_MAGNET_MAX_SPEED;
      }

      // Move toward hero
      const dirX = -dx / dist;
      const dirY = -dy / dist;
      const moveAmount = p.magnetSpeed * dt;
      p.x += dirX * moveAmount;
      p.y += dirY * moveAmount;

      // Recalculate distance after movement
      dx = p.x - heroX;
      dy = p.y - heroY;
      dist = Math.sqrt(dx * dx + dy * dy);

      // Shrink as it gets close
      if (dist < PICKUP_MAGNET_SHRINK_DIST) {
        const shrinkT = 1 - (dist / PICKUP_MAGNET_SHRINK_DIST);
        p.magnetScale = 1.0 - shrinkT * (1.0 - PICKUP_MAGNET_MIN_SCALE);
      } else {
        p.magnetScale = 1.0;
      }
    } else if (!p.magnetActive) {
      p.magnetScale = 1.0;
    }

    // Check collection radius
    if (dist < collectionRadius) {
      p.collected = true;
      events.push({ type: p.type, worldX: p.x, worldY: p.y });
      pickups.splice(i, 1);
      continue;
    }
  }

  return events;
}

/**
 * Draw all pickups on the DrawingSurface using gem sprite textures.
 * Called between tiles/ring layer and particles layer.
 */
export function drawPickups(
  builder: DrawingCommandsBuilder,
  pickups: PickupState[],
  camera: CameraState,
  gameTime: number
): void {
  const screenCX = CANVAS_W / 2;
  const screenCY = CANVAS_H / 2;

  for (const p of pickups) {
    // Flash visibility (blink when age > flashAge)
    if (p.age >= p.flashAge) {
      const blinkRate = 6; // Blinks per second
      const blink = Math.sin(p.age * blinkRate * Math.PI * 2);
      if (blink < 0) continue; // Skip draw on off-phase
    }

    // World to screen position
    const { sx, sy } = worldToScreen(p.x, p.y);
    const finalX = sx - camera.offsetX + screenCX;
    const finalY = sy - camera.offsetY + screenCY;

    // Cull off-screen pickups
    if (finalX < -20 || finalX > CANVAS_W + 20 || finalY < -20 || finalY > CANVAS_H + 20) {
      continue;
    }

    if (p.type === PickupType.GreenGem) {
      drawGemSprite(builder, finalX, finalY, gameTime, p.floatPhase, gem01Brush, p.magnetActive, p.magnetScale);
    } else if (p.type === PickupType.GoldCoin) {
      drawGemSprite(builder, finalX, finalY, gameTime, p.floatPhase, gem02Brush, p.magnetActive, p.magnetScale);
    } else if (p.type === PickupType.HealthHeart) {
      drawHealthHeartSprite(builder, finalX, finalY, gameTime, p.floatPhase, p.magnetActive, p.magnetScale);
    }
  }
}

/**
 * Draw a gem sprite with float animation and magnet scale.
 */
function drawGemSprite(
  builder: DrawingCommandsBuilder,
  x: number,
  y: number,
  gameTime: number,
  phase: number,
  brush: ImageBrush,
  magnetActive: boolean,
  magnetScale: number
): void {
  // Suppress float animation when magnet is active for clean pull movement
  const floatY = magnetActive ? 0 : PICKUP_GEM_FLOAT_AMP * Math.sin(gameTime * (2 * Math.PI / PICKUP_GEM_FLOAT_PERIOD) + phase);
  const drawY = y + floatY;

  // Pulse scale for life-like feel (reduced when magnet active)
  const pulseScale = magnetActive
    ? 1.0
    : 1.0 + 0.08 * Math.sin(gameTime * (2 * Math.PI / PICKUP_GEM_FLOAT_PERIOD) + phase + Math.PI / 3);
  const finalScale = pulseScale * magnetScale;
  const w = PICKUP_GEM_W * finalScale;
  const h = PICKUP_GEM_H * finalScale;

  // Draw gem sprite centered at position
  builder.drawRect(brush, null, {x: x - w / 2, y: drawY - h / 2, width: w, height: h});
}

/**
 * Draw a health heart sprite with float animation and magnet scale.
 */
function drawHealthHeartSprite(
  builder: DrawingCommandsBuilder,
  x: number,
  y: number,
  gameTime: number,
  phase: number,
  magnetActive: boolean,
  magnetScale: number
): void {
  const floatY = magnetActive ? 0 : PICKUP_GEM_FLOAT_AMP * Math.sin(gameTime * (2 * Math.PI / PICKUP_GEM_FLOAT_PERIOD) + phase);
  const drawY = y + floatY;

  const pulseScale = magnetActive
    ? 1.0
    : 1.0 + 0.1 * Math.sin(gameTime * (2 * Math.PI / 0.8) + phase); // Faster heartbeat pulse
  const finalScale = pulseScale * magnetScale;
  const w = PICKUP_HEALTH_W * finalScale;
  const h = PICKUP_HEALTH_H * finalScale;

  builder.drawRect(healthHeartBrush, null, {x: x - w / 2, y: drawY - h / 2, width: w, height: h});
}
