// ─── Play Area ────────────────────────────────────────────────────────────────
// Portrait mobile: 9 × 16 world units, centered at origin (Y-up).
export const HALF_W = 4.5;

// ─── Water ────────────────────────────────────────────────────────────────────
export const WATER_SURFACE_Y = 4.5;
export const WATER_BOTTOM_Y  = -7.5;

// ─── Fish Zone ────────────────────────────────────────────────────────────────
export const FISH_LEFT  = -4.5;
export const FISH_RIGHT =  4.5;

// ─── Rod (top-left, partially off-screen) ─────────────────────────────────────
export const TIP_X       = -2.5;
export const TIP_Y       =  7.0;
export const BAIT_IDLE_X =  TIP_X;
export const BAIT_IDLE_Y =  WATER_SURFACE_Y + 0.2;

// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLOR_LINE       = { r: 0.95, g: 0.95, b: 0.82 };
export const COLOR_LINE_WATER = { r: 0.78, g: 0.90, b: 1.00 };
export const COLOR_BUBBLE     = { r: 0.85, g: 0.95, b: 1.00 };

// ─── Physics ─────────────────────────────────────────────────────────────────
export const GRAVITY          = -2.8;
export const PING_PONG_SPEED  =  0.9;   // gauge oscillation speed (units/s)
export const MAX_LAUNCH_VX    =  5.5;
export const MAX_LAUNCH_VY    =  0.5;
export const WATER_DRAG       =  5.0;   // horizontal deceleration in water

export const REEL_BURST_ADD   =  1.0;
export const REEL_BURST_MAX   =  2.0;
export const REEL_BURST_DECAY =  0.7;
export const REEL_HOLD_DUR    =  0.18;
export const REEL_TAP_JUMP    =  0.15;
export const REEL_SINK_SPEED  =  0.5;

// ─── Timing ───────────────────────────────────────────────────────────────────
export const RESET_DELAY  = 0.4;
export const FLASH_DUR    = 0.22;

// ─── Catch Display ────────────────────────────────────────────────────────────
export const CATCH_SCALE_MUL   = 3.5;
export const CATCH_ZOOM_DUR    = 0.55;
export const CATCH_INPUT_DELAY = 0.80;

// ─── Waves ────────────────────────────────────────────────────────────────────
export const FISH_PER_WAVE  = 5;
export const WAVE_SPEED_MAX = 2.0;
export const WAVE_SPEED_STEP = 0.08;

// ─── Bubbles ─────────────────────────────────────────────────────────────────
export const BUBBLE_RISE_SPEED_MIN = 0.22;
export const BUBBLE_RISE_SPEED_MAX = 0.55;
export const BUBBLE_SCALE_MIN      = 0.04;
export const BUBBLE_SCALE_MAX      = 0.09;

// ─── Water Layers ─────────────────────────────────────────────────────────────
// 8 gameplay layers adapted for portrait depth (surface Y=4.5 to bottom Y=-8).
// Index 0 = surface, 7 = sand.
const _LAYER_Y = [4.0, 2.8, 1.4, 0.0, -1.4, -2.8, -5.0, -6.5] as const;

export function layerToWorldY(layer: number): number {
  return _LAYER_Y[Math.max(0, Math.min(7, Math.round(layer)))];
}

/** Random Y within a fish def's layer range. */
export function randomYForLayers(layerMin: number, layerMax: number): number {
  const yDeep    = layerToWorldY(layerMax); // deeper = more negative Y
  const ySurface = layerToWorldY(layerMin);
  return yDeep + Math.random() * (ySurface - yDeep);
}
