import type { Rect } from "./Types";

// ─── Play Area ────────────────────────────────────────────────────────────────
// Portrait mobile: 9 × 16 world units, centered on the world origin (Y-up).

export const WIDTH  = 9;
export const HEIGHT = 16;

export const BOUNDS: Rect = {
  x: -WIDTH  / 2,
  y: -HEIGHT / 2,
  w: WIDTH,
  h: HEIGHT,
};

// ─── Coordinate Mapping ───────────────────────────────────────────────────────
// Original HTML canvas: 390 × 700 px, Y-down (origin top-left).
// Conversion: worldX = (htmlX - 195) * PX_TO_WORLD
//             worldY = (350 - htmlY) * PX_TO_WORLD

export const PX_TO_WORLD = HEIGHT / 700;  // ≈ 0.02286  (1 HTML px → world units)

// ─── Gameplay Zones (world space, Y-up) ──────────────────────────────────────

/** Y below which a log corner triggers game-over. */
export const FLOOR_Y  = (350 - 633) * PX_TO_WORLD;  // ≈ -6.47
/** Y where ghost-preview logs are shown. */
export const START_Y  = (350 - 58)  * PX_TO_WORLD;  // ≈  6.68
/** Top of the scoring zone (logs above this score 0). */
export const PLAY_TOP = (350 - 110) * PX_TO_WORLD;  // ≈  5.49

// ─── Log Dimensions ───────────────────────────────────────────────────────────

export const LOG_W_MAX = 170 * PX_TO_WORLD;  // ≈ 3.89 wu
export const LOG_W_MIN = 90  * PX_TO_WORLD;  // ≈ 2.06 wu
export const LOG_H     = 20  * PX_TO_WORLD;  // ≈ 0.46 wu

// ─── Physics ─────────────────────────────────────────────────────────────────

/** Base downward speed for round 0 (world units/s). */
export const SPEED_BASE          = 158 * PX_TO_WORLD;  // ≈ 3.61 wu/s
/** Speed increase per round. */
export const SPEED_INC_PER_ROUND = 15  * PX_TO_WORLD;  // ≈ 0.34 wu/s
/** Max magnitude of initial horizontal drift (world units/s). */
export const VX_INIT_MAX         = 120 * PX_TO_WORLD;  // ≈ 2.74 wu/s
/** Min magnitude of initial horizontal drift (world units/s). */
export const VX_INIT_MIN         = 45  * PX_TO_WORLD;  // ≈ 1.03 wu/s

// Wall-bounce physics factors
export const BOUNCE_VX_DAMP          = 0.82;  // vx retention on wall hit
export const BOUNCE_VY_DAMP          = 0.97;  // slight vertical slow on wall hit
export const BOUNCE_TORQUE_FLIP      = 0.75;  // torque retention factor on hard bounce
export const BOUNCE_TORQUE_ADD       = 2.0;   // extra angular kick on hard bounce (rad/s)
export const BOUNCE_TORQUE_FLIP_SOFT = 0.50;  // torque retention factor on soft bounce
export const BOUNCE_TORQUE_ADD_SOFT  = 0.8;   // extra angular kick on soft bounce (rad/s)
export const BOUNCE_KICK_FULL        = 45 * PX_TO_WORLD;  // hard bounce extra vx (wu/s) ≈ 1.03
export const BOUNCE_KICK_SOFT        = 25 * PX_TO_WORLD;  // soft bounce extra vx (wu/s) ≈ 0.57

/** Min distance from each wall edge that a log center must maintain. */
export const CX_WALL_MARGIN = 18 * PX_TO_WORLD;  // ≈ 0.41 wu

// ─── Log Rotation ─────────────────────────────────────────────────────────────

export const MAX_ANGLE_DEG  = 50;   // max initial tilt at spawn (degrees)
export const MAX_TORQUE_DEG = 220;  // max angular velocity at spawn (degrees/s)
export const MAX_PIVOT      = 0.50; // max pivot offset (fraction of half-width)

// ─── Timing ───────────────────────────────────────────────────────────────────

export const SPAWN_DELAY_MS  = 1100;  // delay between successive log spawns
export const RESUME_DELAY_MS = 280;   // pause after freeze before resuming falling
export const FREEZE_HOLD_MS  = 240;   // how long frozen log stays at full opacity
export const FREEZE_FADE_MS  = 460;   // duration of frozen log fade-out

// ─── Scoring Thresholds ───────────────────────────────────────────────────────
// d = 1 - precision (distance from perfect). 0 = touching floor, 1 = at PLAY_TOP.

export const PERFECT_DIST = 0.035;
export const GREAT_DIST   = 0.13;
export const GOOD_DIST    = 0.32;
export const EARLY_DIST   = 0.6;

export const SCORE_PERFECT = 1000;
export const SCORE_GREAT   = 650;
export const SCORE_GOOD    = 350;
export const SCORE_EARLY   = 150;
export const SCORE_MISS    = 30;
/** Bonus: up to +250 pts based on precision (multiplied by precision 0–1). */
export const SCORE_BONUS_MAX = 250;

// ─── Log Physics ──────────────────────────────────────────────────────────────

/** Downward acceleration applied to logs each frame (wu/s²). Adds gravity feel. */
export const LOG_ACCEL = 2.5;

// ─── Ball Physics ─────────────────────────────────────────────────────────────

export const BALL_RADIUS_MIN       = 0.35;  // wu
export const BALL_RADIUS_MAX       = 0.75;  // wu
export const BALL_VX_MIN           = 1.2;   // wu/s — min horizontal drift magnitude
export const BALL_VX_MAX           = 3.2;   // wu/s — max horizontal drift magnitude
export const BALL_VY_INIT          = -2.0;  // wu/s — initial downward velocity at spawn
export const BALL_GRAVITY          = 5.0;   // wu/s² — downward acceleration magnitude
export const BALL_BOUNCE_DAMPING   = 0.88;  // vx retention factor on wall hit

// ─── Rounds ───────────────────────────────────────────────────────────────────

export const TOTAL_ROUNDS = 10;
