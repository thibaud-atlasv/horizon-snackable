// Arena Vermin — Minigun Weapon System (pure logic module)
// Handles rapid-fire projectiles aimed at the nearest enemy.
// Higher levels fire multiple bullets with angular spread.

import type { DrawingCommandsBuilder } from 'meta/worlds';
import { SolidBrush, Pen } from 'meta/worlds';
import { Color } from 'meta/platform_api';
import type { CameraState, EnemyState, MinigunState, MinigunBulletState } from './Types';
import { worldToScreen } from './IsoRenderer';
import {
  MINIGUN_LEVELS, MINIGUN_BULLET_SPEED, MINIGUN_BULLET_MAX_AGE,
  MINIGUN_BULLET_RADIUS, MINIGUN_BULLET_SIZE_PX,
  MINIGUN_BULLET_COLOR, MINIGUN_BULLET_GLOW_COLOR,
  CANVAS_W, CANVAS_H,
} from './Constants';

const bulletFillBrush = new SolidBrush(Color.fromHex(MINIGUN_BULLET_COLOR));
const bulletGlowBrush = new SolidBrush(Color.fromHex(MINIGUN_BULLET_GLOW_COLOR));
const bulletGlowPen = new Pen(bulletGlowBrush, 2);

export interface MinigunHitResult {
  enemyIndex: number;
  damage: number;
}

/** Initialize minigun state for the current level. */
export function initMinigun(level: number): MinigunState {
  return { lastFireTime: -999 };
}

/** Update minigun: fire bullets at nearest enemy based on fire rate and level. */
export function updateMinigun(
  state: MinigunState,
  heroX: number,
  heroY: number,
  enemies: EnemyState[],
  dt: number,
  level: number,
  gameTime: number,
  bullets: MinigunBulletState[],
): void {
  if (level <= 0) return;

  const data = MINIGUN_LEVELS[level - 1];
  const fireInterval = 1.0 / data.fireRate;
  const fireRangeSq = data.range * data.range;

  // Check fire cooldown
  if (gameTime - state.lastFireTime < fireInterval) return;

  // Find nearest alive enemy within range
  let nearestIdx = -1;
  let nearestDistSq = fireRangeSq;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy.isDead || enemy.isSpawning) continue;
    const dx = enemy.x - heroX;
    const dy = enemy.y - heroY;
    const distSq = dx * dx + dy * dy;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearestIdx = i;
    }
  }

  // Fire at nearest enemy
  if (nearestIdx >= 0) {
    const target = enemies[nearestIdx];
    const dx = target.x - heroX;
    const dy = target.y - heroY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= 0) return;

    const baseDirX = dx / dist;
    const baseDirY = dy / dist;

    if (data.bulletCount === 1) {
      // Single bullet, no spread
      bullets.push({
        x: heroX,
        y: heroY,
        vx: baseDirX * MINIGUN_BULLET_SPEED,
        vy: baseDirY * MINIGUN_BULLET_SPEED,
        age: 0,
        damage: data.damage,
      });
    } else {
      // Multiple bullets with angular spread
      const spreadRad = (data.spreadDeg * Math.PI) / 180;
      const baseAngle = Math.atan2(baseDirY, baseDirX);

      for (let b = 0; b < data.bulletCount; b++) {
        // Distribute bullets evenly across the spread range
        const t = data.bulletCount === 1 ? 0 : (b / (data.bulletCount - 1)) * 2 - 1; // -1 to 1
        const angle = baseAngle + t * spreadRad;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);

        bullets.push({
          x: heroX,
          y: heroY,
          vx: dirX * MINIGUN_BULLET_SPEED,
          vy: dirY * MINIGUN_BULLET_SPEED,
          age: 0,
          damage: data.damage,
        });
      }
    }

    state.lastFireTime = gameTime;
  }
}

/** Update minigun bullets: move, check collision with enemies, remove expired. Returns hits. */
export function updateMinigunBullets(
  bullets: MinigunBulletState[],
  dt: number,
  enemies: EnemyState[],
): MinigunHitResult[] {
  const hits: MinigunHitResult[] = [];

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.age += dt;

    // Remove if expired
    if (b.age >= MINIGUN_BULLET_MAX_AGE) {
      bullets.splice(i, 1);
      continue;
    }

    // Check collision with enemies (circle-circle)
    let hit = false;
    for (let e = 0; e < enemies.length; e++) {
      const enemy = enemies[e];
      if (enemy.isDead || enemy.isSpawning) continue;
      const enemyRadius = 0.5;
      const dx = b.x - enemy.x;
      const dy = b.y - enemy.y;
      const distSq = dx * dx + dy * dy;
      const hitDist = MINIGUN_BULLET_RADIUS + enemyRadius;
      if (distSq < hitDist * hitDist) {
        hits.push({ enemyIndex: e, damage: b.damage });
        hit = true;
        break;
      }
    }

    if (hit) {
      bullets.splice(i, 1);
    }
  }

  return hits;
}

/** Draw minigun bullets on the DrawingSurface, oriented along their velocity. */
export function drawMinigunBullets(
  builder: DrawingCommandsBuilder,
  bullets: MinigunBulletState[],
  camera: CameraState,
): void {
  const screenCX = CANVAS_W / 2;
  const screenCY = CANVAS_H / 2;
  // Elongated bullet: 6px long, 3px wide (half-extents)
  const bulletLenHalf = 6;
  const bulletWidHalf = 3;
  const glowLenHalf = bulletLenHalf + 2;
  const glowWidHalf = bulletWidHalf + 1;

  for (const b of bullets) {
    const { sx, sy } = worldToScreen(b.x, b.y);
    const screenX = sx - camera.offsetX + screenCX;
    const screenY = sy - camera.offsetY + screenCY;

    // Cull off-screen
    if (screenX < -20 || screenX > CANVAS_W + 20 || screenY < -20 || screenY > CANVAS_H + 20) continue;

    // Compute angle from velocity (degrees, clockwise for DrawingSurface)
    const angleDeg = Math.atan2(b.vy, b.vx) * 180 / Math.PI;

    // Translate to bullet position, rotate to face travel direction
    builder.pushTranslate({x: screenX, y: screenY});
    builder.pushRotate(angleDeg, {x: 0, y: 0});

    // Glow (elongated ellipse behind)
    builder.drawEllipse(null, bulletGlowPen, {x: 0, y: 0}, {x: glowLenHalf, y: glowWidHalf});
    // Filled core (elongated ellipse)
    builder.drawEllipse(bulletFillBrush, null, {x: 0, y: 0}, {x: bulletLenHalf, y: bulletWidHalf});

    builder.pop(); // rotate
    builder.pop(); // translate
  }
}
