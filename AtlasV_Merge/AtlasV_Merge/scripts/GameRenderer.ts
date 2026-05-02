/**
 * GameRenderer.ts — All drawing functions for the Suika Merge Game.
 *
 * Uses DrawingCommandsBuilder with sprite-based rendering via ImageBrush.
 * Draw order: background sprite → jar interior (with glass glow) → items →
 * particles → floating tags → danger shimmer → held item + next preview.
 */
import {
  DrawingCommandsBuilder,
  SolidBrush,
  ImageBrush,
  Pen,
  Font,
  FontFamily,
  FontWeight,
  FontStyle,
  FontStretch,
} from 'meta/custom_ui_experimental';
import { Color, Vec2 } from 'meta/platform_api';

import { TIER_DEFS } from '../data/MergeLadder';
import { TIER_TEXTURES, backgroundTexture } from './Assets';
import {
  CANVAS_W,
  CANVAS_H,
  CONTAINER_LEFT,
  CONTAINER_RIGHT,
  CONTAINER_BOTTOM,
  CONTAINER_TOP,
  DROP_Y,
  DANGER_LINE_Y,
  NEXT_PREVIEW_X,
  NEXT_PREVIEW_Y,
  NEXT_PREVIEW_SCALE,
} from './Constants';
import type { GameItem, FloatingTag, MergeAnimation } from './Types';
import { MergePhase } from './Types';
import {
  drawParticles as drawVFXParticles,
  getShakeOffset,
  drawDangerShimmer,
  getIdleScale,
} from './VisualEffects';

// === Pre-created reusable resources ===

// Background sprite brush (full canvas)
const bgBrush = new ImageBrush(backgroundTexture);

// Container styling — glass jar look
const jarInteriorBrush = new SolidBrush(Color.fromHex('#2A1B3D'));

// Depth gradient layers (simulated gradient: lighter top, darker bottom)
const jarDepthTop = new SolidBrush(new Color(0.23, 0.15, 0.33, 0.25));
const jarDepthMid = new SolidBrush(new Color(0.15, 0.08, 0.24, 0.45));
const jarDepthBottom = new SolidBrush(new Color(0.10, 0.05, 0.16, 0.65));

// Outer glass border (white, semi-transparent, thick)
const glassOuterBrush = new SolidBrush(new Color(1, 1, 1, 0.35));
const glassOuterPen = new Pen(glassOuterBrush, 4);

// Inner highlight line (thinner, dimmer) for 3D glass feel
const glassInnerBrush = new SolidBrush(new Color(1, 1, 1, 0.10));
const glassInnerPen = new Pen(glassInnerBrush, 1.5);

const heldItemOverlayBrush = new SolidBrush(new Color(1, 1, 1, 0.3));

const guideLineBrush = new SolidBrush(new Color(0.5, 0.5, 0.5, 0.25));
const guideLinePen = new Pen(guideLineBrush, 1);

const nextLabelFont = new Font(
  FontFamily.Roboto, FontWeight.Bold, FontStyle.Normal, FontStretch.Normal
);
const nextLabelBrush = new SolidBrush(Color.fromHex('#E8C8F0'));
const nextBgBrush = new SolidBrush(new Color(0.16, 0.11, 0.24, 0.85));
const nextBorderBrush = new SolidBrush(new Color(1, 1, 1, 0.2));
const nextBorderPen = new Pen(nextBorderBrush, 2);

// Pre-create ImageBrush for each tier
const tierBrushes: ImageBrush[] = TIER_TEXTURES.map(tex => new ImageBrush(tex));

const floatTagFont = new Font(
  FontFamily.Roboto, FontWeight.Bold, FontStyle.Normal, FontStretch.Normal
);

// Container interior path (rounded bottom corners)
const CORNER_R = 16;
const INTERIOR_PATH = `M ${CONTAINER_LEFT} ${CONTAINER_TOP} L ${CONTAINER_LEFT} ${CONTAINER_BOTTOM - CORNER_R} Q ${CONTAINER_LEFT} ${CONTAINER_BOTTOM} ${CONTAINER_LEFT + CORNER_R} ${CONTAINER_BOTTOM} L ${CONTAINER_RIGHT - CORNER_R} ${CONTAINER_BOTTOM} Q ${CONTAINER_RIGHT} ${CONTAINER_BOTTOM} ${CONTAINER_RIGHT} ${CONTAINER_BOTTOM - CORNER_R} L ${CONTAINER_RIGHT} ${CONTAINER_TOP} Z`;
const WALL_PATH = `M ${CONTAINER_LEFT} ${CONTAINER_TOP} L ${CONTAINER_LEFT} ${CONTAINER_BOTTOM - CORNER_R} Q ${CONTAINER_LEFT} ${CONTAINER_BOTTOM} ${CONTAINER_LEFT + CORNER_R} ${CONTAINER_BOTTOM} L ${CONTAINER_RIGHT - CORNER_R} ${CONTAINER_BOTTOM} Q ${CONTAINER_RIGHT} ${CONTAINER_BOTTOM} ${CONTAINER_RIGHT} ${CONTAINER_BOTTOM - CORNER_R} L ${CONTAINER_RIGHT} ${CONTAINER_TOP}`;

// ============================================================
// DRAWING FUNCTIONS
// ============================================================

/**
 * Draw the background sprite, filling the full canvas.
 */
export function drawBackground(builder: DrawingCommandsBuilder): void {
  builder.drawRect(bgBrush, null, { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H });
}

/**
 * Draw the container interior with a gradient depth fill and clean glass outline.
 * No internal glow strips — just a dark interior with gradient shading
 * and a white outer border for a 3D glass impression.
 */
export function drawContainerInterior(builder: DrawingCommandsBuilder): void {
  // Dark interior base with rounded bottom corners
  builder.drawPath(jarInteriorBrush, null, INTERIOR_PATH);

  // Simulated depth gradient using 3 layered horizontal bands
  const containerW = CONTAINER_RIGHT - CONTAINER_LEFT;
  const containerH = CONTAINER_BOTTOM - CONTAINER_TOP;
  const bandH = containerH / 3;
  builder.drawRect(jarDepthTop, null, {
    x: CONTAINER_LEFT, y: CONTAINER_TOP, width: containerW, height: bandH,
  });
  builder.drawRect(jarDepthMid, null, {
    x: CONTAINER_LEFT, y: CONTAINER_TOP + bandH, width: containerW, height: bandH,
  });
  builder.drawRect(jarDepthBottom, null, {
    x: CONTAINER_LEFT, y: CONTAINER_TOP + bandH * 2, width: containerW, height: bandH,
  });

  // Outer glass border — thick, white, semi-transparent
  builder.drawPath(null, glassOuterPen, WALL_PATH);

  // Inner highlight line — subtle, slightly inset for 3D glass feel
  builder.drawPath(null, glassInnerPen, WALL_PATH);
}

/**
 * Draw animated danger line with soft coral/pink layered glow and slow pulse (~0.7Hz).
 */
export function drawDangerLine(builder: DrawingCommandsBuilder, frameCount: number): void {
  // Slow sine pulse ~0.7Hz: 0.044 * 72fps ≈ 3.17 rad/s ≈ 0.5Hz
  const pulse = Math.sin(frameCount * 0.044);
  // Coral/pink base color: #FF8A80 ≈ (1.0, 0.54, 0.50)
  const cr = 1.0;
  const cg = 0.54;
  const cb = 0.50;

  const x1 = CONTAINER_LEFT + 10;
  const x2 = CONTAINER_RIGHT - 10;

  // Layer 1: Wide background glow (8px, very faint)
  const outerAlpha = 0.08 + 0.032 * pulse;
  const outerBrush = new SolidBrush(new Color(cr, cg, cb, outerAlpha));
  const outerPen = new Pen(outerBrush, 8);
  builder.drawLine(outerPen, new Vec2(x1, DANGER_LINE_Y), new Vec2(x2, DANGER_LINE_Y));

  // Layer 2: Medium glow (4px, moderate)
  const midAlpha = 0.15 + 0.06 * pulse;
  const midBrush = new SolidBrush(new Color(cr, cg, cb, midAlpha));
  const midPen = new Pen(midBrush, 4);
  builder.drawLine(midPen, new Vec2(x1, DANGER_LINE_Y), new Vec2(x2, DANGER_LINE_Y));

  // Layer 3: Thin core line (1.5px, brighter)
  const coreAlpha = 0.30 + 0.10 * pulse;
  const coreBrush = new SolidBrush(new Color(cr, cg, cb, coreAlpha));
  const corePen = new Pen(coreBrush, 1.5);
  builder.drawLine(corePen, new Vec2(x1, DANGER_LINE_Y), new Vec2(x2, DANGER_LINE_Y));
}

/**
 * Draw a single item with squash/stretch and idle scale support.
 * @param scaleX Combined horizontal scale (scaleAnim * squashX * idleScale).
 * @param scaleY Combined vertical scale (scaleAnim * squashY * idleScale).
 * @param angleDeg Rotation angle in degrees.
 */
export function drawItem(
  builder: DrawingCommandsBuilder,
  x: number,
  y: number,
  tier: number,
  radius: number,
  scaleX: number = 1.0,
  scaleY: number = 1.0,
  angleDeg: number = 0,
): void {
  const rx = radius * scaleX;
  const ry = radius * scaleY;
  if (rx < 1 || ry < 1) return;

  const dw = rx * 2;
  const dh = ry * 2;

  const needsTransform = angleDeg !== 0 || scaleX !== scaleY;

  if (needsTransform) {
    builder.pushTranslate(x, y);
    if (angleDeg !== 0) {
      builder.pushRotate(angleDeg, 0, 0);
    }
    builder.drawRect(tierBrushes[tier], null, {
      x: -rx,
      y: -ry,
      width: dw,
      height: dh,
    });
    if (angleDeg !== 0) {
      builder.pop(); // rotate
    }
    builder.pop(); // translate
  } else {
    builder.drawRect(tierBrushes[tier], null, {
      x: x - rx,
      y: y - ry,
      width: dw,
      height: dh,
    });
  }
}

/**
 * Draw all items in the container with squash/stretch and idle motion.
 * @param time Accumulated game time in seconds (for idle animation).
 */
export function drawItems(
  builder: DrawingCommandsBuilder,
  items: GameItem[],
  time: number,
): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const baseScale = item.scaleAnim < 1 ? item.scaleAnim : 1;
    const idle = getIdleScale(item, time);
    const scaleX = baseScale * item.squashX * idle;
    const scaleY = baseScale * item.squashY * idle;
    const angleDeg = (item.angle * 180) / Math.PI;
    drawItem(builder, item.x, item.y, item.tier, item.radius, scaleX, scaleY, angleDeg);
  }
}

/**
 * Draw the held item (before drop) with a vertical guide line and subtle breathing pulse.
 */
export function drawHeldItem(
  builder: DrawingCommandsBuilder,
  x: number,
  tier: number,
  radius: number,
  bobOffset: number,
  gameTime: number,
): void {
  const y = DROP_Y + bobOffset;

  // Gentle breathing pulse (~0.6 Hz, ±5% scale)
  const pulseScale = 1.0 + 0.05 * Math.sin(gameTime * 4.0);

  // Vertical guide line from held item down to container
  builder.drawLine(guideLinePen,
    new Vec2(x, y + radius),
    new Vec2(x, CONTAINER_BOTTOM)
  );

  // Draw the item with breathing scale
  drawItem(builder, x, y, tier, radius, pulseScale, pulseScale);

  // Semi-transparent overlay to indicate it's not yet placed
  builder.drawEllipse(heldItemOverlayBrush, null, x, y, radius * pulseScale, radius * pulseScale);
}

/**
 * Draw the "NEXT" preview box with the upcoming item.
 * Frame is always visible; sprite inside scales with previewScale for pop animation.
 * @param previewScale Scale factor for the sprite inside (0→1 with overshoot).
 */
export function drawNextPreview(
  builder: DrawingCommandsBuilder,
  tier: number,
  previewScale: number = 1.0,
): void {
  const boxSize = 56;
  const bx = NEXT_PREVIEW_X - boxSize / 2;
  const by = NEXT_PREVIEW_Y - boxSize / 2 + 10;

  // Frame is always drawn
  builder.drawRoundRect(nextBgBrush, nextBorderPen, { x: bx, y: by, width: boxSize, height: boxSize }, 8, 8);
  builder.drawText('NEXT', bx + 6, by - 16, boxSize - 12, 16, 11, nextLabelBrush, nextLabelFont);

  // Sprite scales with previewScale (pop animation)
  if (previewScale > 0.01) {
    const previewRadius = TIER_DEFS[tier].radius * NEXT_PREVIEW_SCALE;
    const clampedRadius = Math.min(previewRadius, boxSize / 2 - 4);
    const scaledRadius = clampedRadius * previewScale;
    drawItem(builder, NEXT_PREVIEW_X, NEXT_PREVIEW_Y + 10, tier, scaledRadius);
  }
}

/**
 * Draw floating "+points" tags that drift upward and fade out.
 */
export function drawFloatingTags(
  builder: DrawingCommandsBuilder,
  tags: FloatingTag[],
): void {
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    if (tag.alpha <= 0) continue;

    const shadowBrush = new SolidBrush(new Color(0, 0, 0, tag.alpha * 0.5));
    builder.drawText(tag.text, tag.x - 30 + 1, tag.y + 1, 60, 24, 18, shadowBrush, floatTagFont);

    const mainBrush = new SolidBrush(new Color(1, 1, 1, tag.alpha));
    builder.drawText(tag.text, tag.x - 30, tag.y, 60, 24, 18, mainBrush, floatTagFont);
  }
}

/**
 * Draw merge flash halos for active merge animations.
 * Uses radial gradient from white/tier-color center to transparent edge.
 */
export function drawMergeFlashes(
  builder: DrawingCommandsBuilder,
  mergeAnimations: MergeAnimation[],
): void {
  for (let i = 0; i < mergeAnimations.length; i++) {
    const anim = mergeAnimations[i];
    if (anim.flashAlpha <= 0.01) continue;

    const tierDef = TIER_DEFS[anim.newTier];
    const baseRadius = tierDef.radius;

    // Flash expands: starts at tier radius, grows to 1.8x
    let radiusMultiplier = 1.0;
    if (anim.phase === MergePhase.Flash) {
      const progress = 1.0 - Math.max(0, anim.timer / 0.08);
      radiusMultiplier = 1.0 + 0.8 * progress;
    } else if (anim.phase === MergePhase.PopIn) {
      radiusMultiplier = 1.8;
    }

    const flashRadius = baseRadius * radiusMultiplier;
    const color = Color.fromHex(anim.colorHex);
    const alpha = anim.flashAlpha * 0.7;

    // Layered ellipses to simulate radial gradient flash
    // Outer glow (large, faint)
    const outerBrush = new SolidBrush(new Color(color.r, color.g, color.b, alpha * 0.15));
    builder.drawEllipse(outerBrush, null, anim.midX, anim.midY, flashRadius * 1.3, flashRadius * 1.3);

    // Mid glow
    const midBrush = new SolidBrush(new Color(color.r, color.g, color.b, alpha * 0.35));
    builder.drawEllipse(midBrush, null, anim.midX, anim.midY, flashRadius, flashRadius);

    // Inner bright core
    const innerBrush = new SolidBrush(new Color(1, 1, 1, alpha * 0.6));
    builder.drawEllipse(innerBrush, null, anim.midX, anim.midY, flashRadius * 0.4, flashRadius * 0.4);
  }
}

/**
 * Master render function — draws the entire game scene in the correct layer order.
 * Call this from GameComponent each frame.
 */
export function renderFullScene(
  builder: DrawingCommandsBuilder,
  items: GameItem[],
  floatingTags: FloatingTag[],
  mergeAnimations: MergeAnimation[],
  hasHeldItem: boolean,
  heldX: number,
  heldTier: number,
  nextTier: number,
  bobOffset: number,
  isPlaying: boolean,
  frameCount: number,
  gameTime: number,
  nextPreviewScale: number = 1.0,
): void {
  builder.clear();

  // 1. Background sprite
  drawBackground(builder);

  // 2. Container interior (dark play area behind items)
  drawContainerInterior(builder);

  // 3. Danger line
  drawDangerLine(builder, frameCount);

  // 4. Apply screen shake to game area content
  const shake = getShakeOffset();
  if (shake.x !== 0 || shake.y !== 0) {
    builder.pushTranslate(shake.x, shake.y);
  }

  // 5. Items with squash/stretch and idle motion
  drawItems(builder, items, gameTime);

  // 6. Merge flash effects (after items, before particles)
  drawMergeFlashes(builder, mergeAnimations);

  // 7. Particles (after items, part of shaken content)
  drawVFXParticles(builder);

  // 8. Floating score tags
  drawFloatingTags(builder, floatingTags);

  // Pop shake
  if (shake.x !== 0 || shake.y !== 0) {
    builder.pop();
  }

  // 9. Danger shimmer overlay
  drawDangerShimmer(builder, frameCount);

  // 10. Held item + next preview (not shaken — UI-level)
  if (hasHeldItem && isPlaying) {
    drawHeldItem(builder, heldX, heldTier, TIER_DEFS[heldTier].radius, bobOffset, gameTime);
  }
  // Next preview frame is always visible while playing (sprite pops in with animation)
  if (isPlaying) {
    drawNextPreview(builder, nextTier, nextPreviewScale);
  }
}
