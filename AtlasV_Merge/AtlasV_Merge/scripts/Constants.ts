/**
 * Constants for the Suika Merge Game.
 * All velocities are in pixels/second for frame-rate independence.
 */

// === Canvas ===
export const CANVAS_W = 480;
export const CANVAS_H = 800;

// === Container / Jar Bounds ===
// The jar is centered horizontally with some margin on each side
export const CONTAINER_LEFT = 40;
export const CONTAINER_RIGHT = 440;
export const CONTAINER_BOTTOM = 750;
export const CONTAINER_TOP = 120;         // Visual top of container (open)
export const CONTAINER_WALL_THICKNESS = 4;

// Width of the playable area inside the container
export const CONTAINER_WIDTH = CONTAINER_RIGHT - CONTAINER_LEFT;

// === Drop Zone ===
export const DROP_Y = 80;                 // Y position where held item sits before drop
export const DANGER_LINE_Y = 140;         // If items stay above this, game over triggers

// === Physics (pixels/second or pixels/second²) ===
export const GRAVITY = 800;               // Downward acceleration in px/s²
export const RESTITUTION = 0.5;           // Circle-circle bounciness (0 = no bounce, 1 = perfect)
export const WALL_RESTITUTION = 0.45;     // Wall bounciness
export const FRICTION_DAMPING = 2.0;      // Linear velocity damping per second (exponential decay)
export const ANGULAR_FRICTION_DAMPING = 4.0; // Angular velocity damping per second (items spin freely)
export const MAX_VELOCITY = 1200;         // Max speed in px/s to prevent explosion
export const MAX_ANGULAR_VELOCITY = 10;   // Max angular speed in rad/s
export const POSITION_CORRECTION = 0.6;   // How much overlap to correct per frame (0–1)
export const SPIN_TRANSFER = 0.05;        // Fraction of tangential impulse that converts to spin

// === Gameplay Timing (seconds) ===
export const DROP_COOLDOWN = 0.5;         // Time after drop before next item appears
export const MERGE_COOLDOWN = 0.1;        // Per-item cooldown after being created by merge
export const GAME_OVER_DELAY = 2.0;       // Seconds items must be above danger line to trigger game over

// === Score Animation ===
export const SCORE_COUNT_UP_SPEED = 0.3;  // Seconds for score count-up smoothing
export const SCORE_PULSE_SCALE = 1.3;     // Max scale on merge pulse
export const SCORE_PULSE_DECAY = 8.0;     // Pulse decay rate per second toward 1.0
export const FLOAT_TAG_DURATION = 0.7;    // Seconds a floating "+N" tag lives
export const FLOAT_TAG_SPEED = 80;        // Upward drift speed in px/s

// === Visual ===
export const FACE_EYE_OFFSET_X = 0.25;   // Eye X offset as fraction of radius
export const FACE_EYE_OFFSET_Y = -0.1;   // Eye Y offset as fraction of radius
export const FACE_EYE_SIZE = 0.12;        // Eye radius as fraction of item radius
export const FACE_MOUTH_Y = 0.25;         // Mouth Y offset as fraction of radius

// === Next-Up Preview ===
export const NEXT_PREVIEW_X = 420;        // X position of next-up preview
export const NEXT_PREVIEW_Y = 60;          // Y position of next-up preview (top-right, XAML score is top-left)
export const NEXT_PREVIEW_SCALE = 0.7;    // Scale factor for the preview item
