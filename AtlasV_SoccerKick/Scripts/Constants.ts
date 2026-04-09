// ── Game Rules ───────────────────────────────────────────────────────────────

export const TOTAL_SHOTS       = 6;
export const COMBO_THRESHOLD   = 3;    // consecutive goals before multiplier kicks in
export const MAX_COMBO_MULTI   = 6;

// ── Scoring ──────────────────────────────────────────────────────────────────

export const PTS_GOAL          = 100;
export const PTS_CORNER_MULTI  = 1.8;  // multiplier for shots near the post
export const CORNER_THRESHOLD  = 0.65; // |ballX| > GOAL_HALF_W * this = corner

// ── Ball Physics ─────────────────────────────────────────────────────────────

export const BALL_RADIUS       = 0.28;
export const BALL_START_X      = 0;
export const BALL_START_Y      = 0.28; // resting on ground
export const BALL_START_Z      = 9.0;  // penalty spot

export const BALL_SPEED_BASE   = 0.12; // minimum forward speed
export const BALL_SPEED_POWER  = 0.38; // added per unit of swipe power
export const BALL_SIDE_FACTOR  = 1.1;  // lateral velocity multiplier
export const BALL_ARC_BASE     = 0.08; // minimum upward velocity
export const BALL_ARC_POWER    = 0.22; // added per unit of swipe power
export const BALL_GRAVITY      = 0.012;

export const BALL_SPIN_FORWARD = 4.0;  // visual spin speed (forward)
export const BALL_SPIN_SIDE    = 2.0;  // visual spin speed (lateral)

// Ball bounce factors
export const BOUNCE_VY_FAR     = 0.5;  // vertical bounce when far from goal
export const BOUNCE_DAMP_FAR   = 0.85; // horizontal damp when far from goal
export const BOUNCE_VY_NEAR    = 0.4;
export const BOUNCE_DAMP_NEAR  = 0.8;
export const BALL_STOP_SPEED   = 0.015; // total vel below this = stopped

// Result state bounce
export const RESULT_BOUNCE_VY  = 0.45;
export const RESULT_BOUNCE_XZ  = 0.82;
export const NET_BOUNCE_DAMP   = 0.4;

// Save deflection
export const SAVE_BOUNCE_Z     = 0.5;
export const SAVE_BOUNCE_Z_MIN = 0.08;
export const SAVE_BOUNCE_X     = -0.4;
export const SAVE_BOUNCE_VY    = 0.1;

// Post deflection
export const POST_BOUNCE_X     = -0.6;
export const POST_BOUNCE_Z     = -0.4;

// ── Goal Geometry ────────────────────────────────────────────────────────────

export const GOAL_WIDTH        = 5.5;
export const GOAL_HEIGHT       = 2.4;
export const GOAL_DEPTH        = 1.4;
export const GOAL_POST_RADIUS  = 0.07;
export const GOAL_HALF_W       = GOAL_WIDTH / 2;

// ── Goalkeeper ───────────────────────────────────────────────────────────────

export const GK_START_Z        = 0.6;  // standing distance in front of goal line
export const GK_SPEED          = 0.055;
export const GK_IDLE_SPEED     = 0.018;
export const GK_REACTION_MS    = 260;
export const GK_DIVE_CHANCE    = 0.72;
export const GK_DIVE_SPEED     = 1.8;  // diveT increment per second
export const GK_DIVE_LATERAL   = 1.6;  // how far the dive moves sideways
export const GK_DIVE_HEIGHT    = 0.6;  // peak vertical offset during dive

// GK collision box (standing)
export const GK_HALF_W         = 0.32;
export const GK_STAND_H        = 1.85;

// GK collision box (diving) — expands with diveT
export const GK_DIVE_HALF_W_BASE  = 0.95;
export const GK_DIVE_HALF_W_GROW  = 0.4;
export const GK_DIVE_H_BASE       = 0.55;
export const GK_DIVE_H_GROW       = 0.3;

// ── Swipe Input (normalised 0..1 screen coordinates) ─────────────────────────

export const SWIPE_DEAD_ZONE    = 0.02; // minimum upward swipe to fire
export const SWIPE_POWER_RANGE  = 0.25; // vertical distance for full power
export const SWIPE_SIDE_RANGE   = 0.25; // horizontal distance for full side aim

// ── Timing ───────────────────────────────────────────────────────────────────

export const NEXT_SHOT_GOAL_MS = 1500;
export const NEXT_SHOT_SAVE_MS = 1300;
export const NEXT_SHOT_POST_MS = 1300;
export const NEXT_SHOT_MISS_MS = 1000;
export const GAME_OVER_DELAY   = 400;

// ── Camera ───────────────────────────────────────────────────────────────────

export const CAMERA_FOV        = 58;
