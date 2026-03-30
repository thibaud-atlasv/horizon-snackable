// ─── Play Area ────────────────────────────────────────────────────────────────
// Portrait mobile: 9 × 16 world units, centered at origin (Y-up).
export const HALF_W = 4.5;

// ─── Water ────────────────────────────────────────────────────────────────────
export const WATER_SURFACE_Y = 4.5;
export const WATER_BOTTOM_Y  = -8.0;

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
export const MIN_LAUNCH_VX    = -2.0;  // negative = left of tip
export const MAX_LAUNCH_VX    =  5.5;
export const MAX_LAUNCH_VY    =  0.5;
export const WATER_DRAG       =  5.0;   // horizontal deceleration in water

export const REEL_BURST_ADD       =  1.0;
export const REEL_BURST_MAX       =  2.0;
export const REEL_BURST_DECAY     =  0.7;
export const REEL_HOLD_DUR        =  0.18;
// Fraction of total reel distance gained per tap (A+C: proportional tap, fish fatigue)
export const REEL_TAP_JUMP_RATIO  =  0.08;  // 8% → ~13 taps regardless of depth
export const REEL_SINK_SPEED      =  0.5;
// Fish fatigue: sink resistance at surface vs at depth (0.0–1.0)
export const REEL_FATIGUE_MIN     =  0.30;  // 30% resistance when fish reaches surface

// ─── Timing ───────────────────────────────────────────────────────────────────
export const RESET_DELAY  = 0.4;
export const FLASH_DUR    = 0.22;

// ─── Catch Display ────────────────────────────────────────────────────────────
export const CATCH_SCALE_MUL = 3.5;
export const CATCH_ZOOM_DUR  = 0.55;

// ─── Bubbles ─────────────────────────────────────────────────────────────────
export const BUBBLE_RISE_SPEED_MIN  = 0.22;
export const BUBBLE_RISE_SPEED_MAX  = 0.55;
export const BUBBLE_SCALE_MIN       = 0.04;
export const BUBBLE_SCALE_MAX       = 0.09;
export const BUBBLE_INTERVAL_MIN    = 3.0;   // seconds between bubble spawns per fish
export const BUBBLE_INTERVAL_MAX    = 8.0;
export const BUBBLE_LIFETIME_MIN    = 2.5;   // seconds a bubble lives before disappearing
export const BUBBLE_LIFETIME_MAX    = 5.0;
export const BUBBLE_SPAWN_OFFSET_X  = 0.35;  // forward offset in front of the fish
export const BUBBLE_SPAWN_OFFSET_Y  = 0.10;  // slight upward offset from fish center

// ─── Zone System ──────────────────────────────────────────────────────────────
export const ZONE_COUNT   = 3;
export const ZONE_FLOOR_Y = [-8.0, -24.0, -40.0] as readonly number[];    // index 0 = zone 1

// Zone spawn Y: fish spawn randomly within these bounds in their zone
export const ZONE_SPAWN_TOP_Y = [4.0, -8.5, -24.5] as readonly number[];   // slightly below surface / zone boundary
export const ZONE_SPAWN_BOT_Y = [-7.5, -23.5, -39.5] as readonly number[]; // slightly above floor

// ─── Camera ───────────────────────────────────────────────────────────────────
export const HALF_SCREEN_WORLD_HEIGHT = 8;  // half-height of the viewport in world units (tune with FOV)

// ─── Zone Progression ─────────────────────────────────────────────────────────
export const FISH_MAX_PER_ZONE     = 5;
export const FISH_RESPAWN_INTERVAL = 30;  // seconds between respawns per zone

// ─── Global XP Gauge ──────────────────────────────────────────────────────────
export const XP_NEW_FISH       = 100;   // XP for catching a new species
export const XP_DUPLICATE_FISH = 10;    // XP for catching an already-known species
export const XP_UNLOCK_ZONE_2  = 500;   // XP needed to unlock zone 2
export const XP_UNLOCK_ZONE_3  = 1000;  // XP needed to unlock zone 3
