// Arena Vermin — Elite Enemy DrawingSurface Markers
// Draws floating gold markers above elite enemies for high visibility.

import type { DrawingCommandsBuilder } from 'meta/worlds';
import { SolidBrush, Pen } from 'meta/worlds';
import { Color } from 'meta/platform_api';
import type { EnemyState, CameraState, CameraShakeState } from './Types';
import { worldToScreen, wrapRelative } from './IsoRenderer';
import { getEnemyDims } from './SpriteUpdater';
import {
  CANVAS_W, CANVAS_H, WORLD_W, WORLD_H, ELITE_SCALE,
} from './Constants';

// Module-level resources (avoid creating inside loops)
const goldBrush = new SolidBrush(Color.fromHex('#FFD700'));
const goldPen = new Pen(goldBrush, 2);
const goldRingBrush = new SolidBrush(new Color(1, 0.84, 0, 0.5));
const goldRingPen = new Pen(goldRingBrush, 2);
const brightGoldBrush = new SolidBrush(new Color(1, 0.9, 0.2, 0.8));

// Diamond shape path centered at origin, ~12px tall
const DIAMOND_PATH = 'M 0 -7 L 5 0 L 0 7 L -5 0 Z';
// Small crown shape (3 points) centered at origin
const CROWN_PATH = 'M -6 3 L -4 -3 L -2 0 L 0 -5 L 2 0 L 4 -3 L 6 3 Z';

/** Draw floating elite markers above elite enemies on the DrawingSurface. */
export function drawEliteMarkers(
  builder: DrawingCommandsBuilder,
  enemies: EnemyState[],
  camera: CameraState,
  cameraShake: CameraShakeState,
  heroX: number,
  heroY: number,
  gameTime: number,
): void {
  const screenCX = CANVAS_W / 2;
  const screenCY = CANVAS_H / 2;
  const shakeX = cameraShake.offsetX;
  const shakeY = cameraShake.offsetY;

  for (const enemy of enemies) {
    if (!enemy.isElite || enemy.isDead || enemy.isSpawning) continue;

    const wrappedX = wrapRelative(enemy.x, heroX, WORLD_W);
    const wrappedY = wrapRelative(enemy.y, heroY, WORLD_H);
    const { sx, sy } = worldToScreen(wrappedX, wrappedY);
    const screenX = sx - camera.offsetX + screenCX + shakeX;
    const screenY = sy - camera.offsetY + screenCY + shakeY;

    // Cull off-screen
    if (screenX < -50 || screenX > CANVAS_W + 50 || screenY < -50 || screenY > CANVAS_H + 50) continue;

    const dims = getEnemyDims(enemy.enemyType);
    const scaledH = dims.h * ELITE_SCALE;

    // Position marker above the enemy sprite
    const markerBaseY = screenY - scaledH - 12;
    // Vertical bob animation
    const bobY = Math.sin(gameTime * 4) * 3;
    const markerY = markerBaseY + bobY;

    // Draw a rotating gold diamond marker
    builder.pushTranslate({x: screenX, y: markerY});
    const spinAngle = gameTime * 90; // 90 deg/sec spin
    builder.pushRotate(spinAngle, {x: 0, y: 0});
    builder.drawPath(goldBrush, goldPen, DIAMOND_PATH);
    builder.pop(); // rotate
    builder.pop(); // translate

    // Draw a small crown above the diamond
    builder.pushTranslate({x: screenX, y: markerY - 12});
    builder.drawPath(brightGoldBrush, null, CROWN_PATH);
    builder.pop(); // translate

    // Draw a pulsing elliptical ring around the enemy body center
    const ringCenterY = screenY - scaledH / 2;
    const ringRadius = dims.w * ELITE_SCALE * 0.5 + 4 + Math.sin(gameTime * 3) * 2;
    builder.drawEllipse(null, goldRingPen,
      {x: screenX, y: ringCenterY},
      {x: ringRadius, y: ringRadius * 0.6});
  }
}
