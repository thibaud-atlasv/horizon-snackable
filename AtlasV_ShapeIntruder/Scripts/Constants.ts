// ─── Game Config ──────────────────────────────────────────────────────────────

// Seconds a player has to answer on round 1
export const ROUND_TIME_SEC   = 15;

// Minimum round time regardless of round number
export const ROUND_TIME_MIN   = 3;

// Seconds subtracted per round: time = max(ROUND_TIME_MIN, ROUND_TIME_SEC - round * ROUND_TIME_DECAY)
export const ROUND_TIME_DECAY = 0.5;

// Base points awarded for an instant correct answer (scaled by time remaining)
export const BASE_POINTS = 1000;

// Number of shapes displayed in the main canvas at round 1
export const SHAPE_COUNT_BASE = 15;

// Hard cap on shape count (regardless of difficulty)
export const SHAPE_COUNT_MAX = 50;

// Multiplier applied to shape count each round: shapeCount = base * (1 + round * scale)
export const DIFFICULTY_SCALE = 0.08;

// Number of answer options shown (includes 1 correct + N distractors)
export const OPTION_COUNT = 4;

// Score multiplier per round: score = BASE_POINTS x timePct x (1 + round x ROUND_SCORE_MULT)
export const ROUND_SCORE_MULT = 0.05;

// ─── Leaderboard ──────────────────────────────────────────────────────────────

// Must match the leaderboard name configured in Meta Horizon World settings
export const LEADERBOARD_API_NAME = 'totalscore';

// ─── Debug ────────────────────────────────────────────────────────────────────

// Place 8 shapes exactly at clamp boundaries (corners + edge midpoints) to verify UI doesn't cut them.
export const DEBUG_EDGE_TEST = false;

// Fill the zone with a uniform grid at scale=1 (100% cell size) to calibrate sprite sizing.
// Grid is 5×5, one shape type per column, cycling through SHAPE_TEXTURE_MAP keys.
export const DEBUG_GRID_TEST = false;

// ─── Shape Layout ─────────────────────────────────────────────────────────────

// Normalized [0..1] bounds of the shape placement area within the zone canvas.
// Adjust until DEBUG_EDGE_TEST shapes sit fully visible at all four edges.
export const SHAPES_X_MIN = 0;
export const SHAPES_X_MAX = 1;
export const SHAPES_Y_MIN = 0;
export const SHAPES_Y_MAX = 1;

// Size range as a fraction of cell width (0.75 = 75% of cell, 1.0 = 100%)
export const SHAPE_SIZE_MIN = 0.75;
export const SHAPE_SIZE_MAX = 1.15;

// Rotation range in degrees (shapes rotate between -MAX and +MAX)
export const SHAPE_ROTATION_MAX_DEG = 45;

// How far a shape can spill outside its cell (in cell-width units, 0 = strict grid)
export const SHAPE_JITTER = 0.15;

// ─── Canvas / UI ──────────────────────────────────────────────────────────────

// Intruder zone canvas dimensions -- must match XAML zone canvas size
export const ZONE_SIZE = 438;

// Answer button feedback colors
export const CORRECT_BTN_BG     = '#1A22c55e';
export const CORRECT_BTN_BORDER = '#22c55e';
export const CORRECT_OVERLAY    = '#22c55e';
export const WRONG_BTN_BG       = '#1Aef4444';
export const WRONG_BTN_BORDER   = '#ef4444';
export const WRONG_OVERLAY      = '#ef4444';

// Overlay fade animation
export const OVERLAY_TARGET_OPACITY = 0.3;
export const OVERLAY_DURATION_SEC   = 0.25;

// Wrong-answer shape animation
export const WRONG_FADE_DURATION_SEC  = 0.2;  // time to fade non-matching shapes
export const WRONG_FADE_TARGET        = 0.15; // target opacity for faded shapes
export const WRONG_PULSE_DURATION_SEC = 1.0;  // half-sine pulse: grow to peak then back
export const WRONG_PULSE_PEAK         = 1.4;  // peak scale multiplier

// ─── Timing ───────────────────────────────────────────────────────────────────

// Delay (ms) between a correct answer and the next round starting
export const NEXT_ROUND_DELAY_MS = 500;

// Delay (ms) between a wrong answer / timeout and the game-over screen
export const GAME_OVER_DELAY_MS = 500;
