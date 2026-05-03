/**
 * ActionButtonRenderer — Renders the bottom action button strip on DrawingSurface.
 * Includes: ground strip with gradient fade, 4 circular buttons (WAIT/TWITCH/DRIFT/REEL),
 * press scale animation, and circular ripple feedback.
 */

import {
  DrawingCommandsBuilder,
  SolidBrush,
  LinearGradientBrush,
  Pen,
  Font,
  FontFamily,
  FontWeight,
  FontStyle,
  FontStretch,
  DrawTextAlignment,
} from 'meta/custom_ui';
import { Color } from 'meta/platform_api';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ActionId } from './Constants';

// === Action Button Layout Constants ===
const STRIP_HEIGHT = 110;
const STRIP_Y = CANVAS_HEIGHT - STRIP_HEIGHT;
const STRIP_GRADIENT_HEIGHT = 30; // Top gradient fade zone

const BUTTON_DIAMETER = 72;
const BUTTON_RADIUS = BUTTON_DIAMETER / 2;
const BUTTON_COUNT = 4;
const BUTTON_CENTER_Y = STRIP_Y + STRIP_HEIGHT / 2; // Vertically centered in strip

// Evenly space buttons across the strip width
const BUTTON_SPACING = CANVAS_WIDTH / (BUTTON_COUNT + 1);

// Button definitions in order
const BUTTON_DEFS: { id: ActionId; label: string; isActive: boolean; isReel: boolean }[] = [
  { id: ActionId.Wait, label: 'WAIT', isActive: false, isReel: false },
  { id: ActionId.Twitch, label: 'TWITCH', isActive: true, isReel: false },
  { id: ActionId.Drift, label: 'DRIFT', isActive: false, isReel: false },
  { id: ActionId.Reel, label: 'REEL', isActive: true, isReel: true },
];

// === Colors ===
const BUTTON_BG_COLOR = new Color(15 / 255, 30 / 255, 55 / 255, 0.85);
const BUTTON_BORDER_COLOR = new Color(60 / 255, 110 / 255, 130 / 255, 0.55);
const REEL_BORDER_COLOR = new Color(0xC9 / 255, 0xA8 / 255, 0x4C / 255, 0.75);
const ICON_PASSIVE_COLOR = new Color(1, 1, 1, 0.7);
const ICON_ACTIVE_COLOR = new Color(1, 1, 1, 0.9);
const LABEL_COLOR = new Color(1, 1, 1, 0.65);

// === Press Animation Constants ===
const PRESS_SCALE = 0.92;
const PRESS_SPRING_DURATION = 0.15; // seconds

// === Ripple Animation Constants ===
const RIPPLE_DURATION = 0.18; // seconds
const RIPPLE_START_OPACITY = 0.5;

// === Button State ===
export interface ActionButtonState {
  pressed: boolean;
  pressTimer: number; // 0 = not animating, >0 = springing back
  rippleTimer: number; // 0 = no ripple, >0 = animating
  rippleColor: Color;
  enabled: boolean;
}

export function createButtonStates(): ActionButtonState[] {
  return BUTTON_DEFS.map(() => ({
    pressed: false,
    pressTimer: 0,
    rippleTimer: 0,
    rippleColor: new Color(60 / 255, 110 / 255, 130 / 255, 0.5),
    enabled: true,
  }));
}

/**
 * Get the center position of a button by index.
 */
export function getButtonCenter(index: number): { x: number; y: number } {
  return {
    x: BUTTON_SPACING * (index + 1),
    y: BUTTON_CENTER_Y,
  };
}

/**
 * Hit-test: returns the ActionId if canvas coordinates hit a button, or null.
 */
export function hitTestActionButtons(canvasX: number, canvasY: number, states: ActionButtonState[]): ActionId | null {
  for (let i = 0; i < BUTTON_DEFS.length; i++) {
    if (!states[i].enabled) continue;
    const center = getButtonCenter(i);
    const dx = canvasX - center.x;
    const dy = canvasY - center.y;
    if (dx * dx + dy * dy <= BUTTON_RADIUS * BUTTON_RADIUS) {
      return BUTTON_DEFS[i].id;
    }
  }
  return null;
}

/**
 * Get the button index for a given ActionId.
 */
export function getButtonIndex(actionId: ActionId): number {
  return BUTTON_DEFS.findIndex(b => b.id === actionId);
}

/**
 * Update button animations (call every frame).
 */
export function updateButtonAnimations(states: ActionButtonState[], dt: number): void {
  for (const state of states) {
    // Spring-back after press
    if (state.pressTimer > 0) {
      state.pressTimer -= dt;
      if (state.pressTimer <= 0) {
        state.pressTimer = 0;
        state.pressed = false;
      }
    }
    // Ripple animation
    if (state.rippleTimer > 0) {
      state.rippleTimer -= dt;
      if (state.rippleTimer <= 0) {
        state.rippleTimer = 0;
      }
    }
  }
}

/**
 * Trigger press animation on a button.
 */
export function triggerButtonPress(states: ActionButtonState[], actionId: ActionId): void {
  const idx = getButtonIndex(actionId);
  if (idx < 0) return;
  const state = states[idx];
  state.pressed = true;
  state.pressTimer = PRESS_SPRING_DURATION;
  state.rippleTimer = RIPPLE_DURATION;
  // Use reel gold color for REEL button ripple
  if (BUTTON_DEFS[idx].isReel) {
    state.rippleColor = new Color(0xC9 / 255, 0xA8 / 255, 0x4C / 255, RIPPLE_START_OPACITY);
  } else {
    state.rippleColor = new Color(60 / 255, 110 / 255, 130 / 255, RIPPLE_START_OPACITY);
  }
}

/**
 * Draw the entire action button zone on the DrawingSurface.
 */
export function drawActionButtons(
  builder: DrawingCommandsBuilder,
  states: ActionButtonState[],
  visible: boolean,
): void {
  if (!visible) return;

  // === Ground Strip ===
  // Solid bottom portion
  const solidBrush = new SolidBrush(new Color(5 / 255, 12 / 255, 25 / 255, 0.80));
  builder.drawRect(solidBrush, null, {
    x: 0, y: STRIP_Y + STRIP_GRADIENT_HEIGHT,
    width: CANVAS_WIDTH, height: STRIP_HEIGHT - STRIP_GRADIENT_HEIGHT,
  });

  // Top gradient fade (transparent → solid)
  const gradBrush = new LinearGradientBrush(
    { x: 0, y: STRIP_Y },
    { x: 0, y: STRIP_Y + STRIP_GRADIENT_HEIGHT },
    [
      { offset: 0, color: new Color(5 / 255, 12 / 255, 25 / 255, 0) },
      { offset: 1, color: new Color(5 / 255, 12 / 255, 25 / 255, 0.80) },
    ],
  );
  builder.drawRect(gradBrush, null, {
    x: 0, y: STRIP_Y,
    width: CANVAS_WIDTH, height: STRIP_GRADIENT_HEIGHT,
  });

  // === Buttons ===
  const labelFont = new Font(FontFamily.Roboto, FontWeight.Bold, FontStyle.Normal, FontStretch.Normal);

  for (let i = 0; i < BUTTON_DEFS.length; i++) {
    const def = BUTTON_DEFS[i];
    const state = states[i];
    const center = getButtonCenter(i);

    // Compute scale (press animation)
    let scale = 1.0;
    if (state.pressed && state.pressTimer > 0) {
      // Ease-out spring: starts at PRESS_SCALE, returns to 1.0
      const t = 1 - (state.pressTimer / PRESS_SPRING_DURATION);
      scale = PRESS_SCALE + (1.0 - PRESS_SCALE) * t;
    }

    // Opacity for disabled buttons
    const alpha = state.enabled ? 1.0 : 0.4;

    builder.pushTranslate({ x: center.x, y: center.y });
    if (scale !== 1.0) {
      builder.pushScale({ x: scale, y: scale }, { x: 0, y: 0 });
    }

    // Button background circle
    const bgBrush = new SolidBrush(new Color(
      BUTTON_BG_COLOR.r, BUTTON_BG_COLOR.g, BUTTON_BG_COLOR.b,
      BUTTON_BG_COLOR.a * alpha,
    ));
    builder.drawEllipse(bgBrush, null, { x: 0, y: 0 }, { x: BUTTON_RADIUS, y: BUTTON_RADIUS });

    // Button border
    const borderColor = def.isReel ? REEL_BORDER_COLOR : BUTTON_BORDER_COLOR;
    const borderBrush = new SolidBrush(new Color(
      borderColor.r, borderColor.g, borderColor.b,
      borderColor.a * alpha,
    ));
    const borderPen = new Pen(borderBrush, 1.5);
    builder.drawEllipse(null, borderPen, { x: 0, y: 0 }, { x: BUTTON_RADIUS, y: BUTTON_RADIUS });

    // Label text (centered in button, slightly below center for icon space above)
    const iconColor = def.isActive ? ICON_ACTIVE_COLOR : ICON_PASSIVE_COLOR;
    const textBrush = new SolidBrush(new Color(iconColor.r, iconColor.g, iconColor.b, iconColor.a * alpha));
    // Draw label verb - positioned center of button
    const labelBrush = new SolidBrush(new Color(LABEL_COLOR.r, LABEL_COLOR.g, LABEL_COLOR.b, LABEL_COLOR.a * alpha));
    // Icon area: upper portion (simple text icon for now)
    builder.drawText(def.label, {
      x: -BUTTON_RADIUS, y: -8,
      width: BUTTON_DIAMETER, height: 20,
    }, 9, labelBrush, labelFont, { textAlignment: DrawTextAlignment.Center });

    // Ripple effect
    if (state.rippleTimer > 0) {
      const rippleProgress = 1 - (state.rippleTimer / RIPPLE_DURATION);
      const rippleRadius = BUTTON_RADIUS * rippleProgress;
      const rippleAlpha = RIPPLE_START_OPACITY * (1 - rippleProgress);
      const rippleBrush = new SolidBrush(new Color(
        state.rippleColor.r, state.rippleColor.g, state.rippleColor.b, 0,
      ));
      const ripplePenBrush = new SolidBrush(new Color(
        state.rippleColor.r, state.rippleColor.g, state.rippleColor.b, rippleAlpha,
      ));
      const ripplePen = new Pen(ripplePenBrush, 2);
      builder.drawEllipse(rippleBrush, ripplePen, { x: 0, y: 0 }, { x: rippleRadius, y: rippleRadius });
    }

    if (scale !== 1.0) {
      builder.pop(); // scale
    }
    builder.pop(); // translate
  }
}
