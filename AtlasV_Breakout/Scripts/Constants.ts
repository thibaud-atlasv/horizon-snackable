import type { Rect } from "./Types";

// ── Play area ───────────────────────────────────────────────────────────────
export const HEIGHT = 16;
export const WIDTH = 9;
export const BOUNDS: Rect = {
  x: -WIDTH / 2,
  y: -HEIGHT / 2,
  w: WIDTH,
  h: HEIGHT
};

// ── Particle pool ───────────────────────────────────────────────────────────
export const PARTICLE_POOL_SIZE = 200;
export const TRAIL_POOL_SIZE    = 30;

// ── Brick pool ─────────────────────────────────────────────────────────────
export const BRICK_POOL_SIZE = 80;

// ── Brick: death animation ──────────────────────────────────────────────────
export const DEATH_DURATION   = 0.15;   // seconds to shrink + spin
export const DEATH_SPIN_SPEED = 12;     // radians per second (z-axis)

// ── Brick: reveal animation ────────────────────────────────────────────────
export const REVEAL_DURATION      = 0.35;  // seconds for the pop-in
export const REVEAL_DROP_DURATION = 0.45;  // seconds for the drop-in (longer for bounce)
export const REVEAL_OVERSHOOT     = 1.15;  // peak scale overshoot (bouncy feel)

// ── Coin: spawn ─────────────────────────────────────────────────────────────
export const COINS_PER_BRICK   = 3;
export const COIN_MIN          = 1;
export const COIN_SCATTER      = 1.5;
export const COIN_INITIAL_VY   = -1.0;
export const COIN_GRAVITY      = 6.0;
export const COIN_Z            = -0.1;

// ── Coin: vacuum ────────────────────────────────────────────────────────────
export const VACUUM_RADIUS     = 3.5;
export const VACUUM_FORCE      = 45.0;
export const VACUUM_MAX_SPEED  = 30.0;
export const VACUUM_MIN_SPEED  = 10.0;
export const TANGENT_DAMPING   = 0.85;
export const COLLECT_RADIUS    = 0.5;

// ── Coin: super vacuum (end-of-level magnet) ────────────────────────────────
export const SUPER_VACUUM_FORCE = 25.0;
export const SUPER_VACUUM_MAX   = 12.0;

// ── Coin: visual ────────────────────────────────────────────────────────────
export const COIN_COLOR: [number, number, number] = [1.0, 0.85, 0.2];
export const COIN_SCALE        = 0.15;
export const COIN_MAX_LIFE     = 6.0;
export const COIN_VALUE        = 10;
export const COIN_BURST_COUNT  = 3;

// ── Juice: hit freeze (seconds) ────────────────────────────────────────────
export const FREEZE_BRICK_HIT     = 0.02;
export const FREEZE_BRICK_DESTROY = 0.04;
export const FREEZE_EXPLOSION     = 0.10;
export const FREEZE_BALL_LOST     = 0.06;

// ── Juice: camera shake ─────────────────────────────────────────────────────
export const SHAKE_BRICK_HIT     = { intensity: 0.04,  duration: 0.08 };
export const SHAKE_BRICK_DESTROY = { intensity: 0.08,  duration: 0.15 };
export const SHAKE_PADDLE_HIT   = { intensity: 0.03,  duration: 0.06 };
export const SHAKE_EXPLOSION    = { intensity: 0.25,  duration: 0.35 };
export const SHAKE_BALL_LOST    = { intensity: 0.20,  duration: 0.35 };

// ── Juice: particle counts ──────────────────────────────────────────────────
export const PADDLE_SPARK_COUNT = 4;
export const BRICK_CRACK_COUNT  = 2;

// ── VFX ─────────────────────────────────────────────────────────────────────
export const VFX_FLASH_DURATION = 0.08;  // 80ms white flash
export const VFX_TRAIL_SCALE    = 0.08;
export const VFX_TRAIL_LIFE     = 0.15;
export const VFX_TRAIL_ALPHA    = 0.1;
export const VFX_IMPACT_COUNT   = 3;
export const VFX_PARTICLE_GRAVITY = 9.8;

// ── Ball power: speed scaling ───────────────────────────────────────────────
export const BALL_SPEED_BASE        = 8.5;
export const BALL_SIZE              = 0.5;
export const POWER_SPEED_SCALE      = 0.1;
export const POWER_SPEED_RATE       = 0.6;
export const POWER_MAX_SPEED_BASE   = 1.2;
export const POWER_PIERCE_SPEED_BONUS = 0.08;

// ── Ball power: pierce thresholds ───────────────────────────────────────────
// combo needed → max pierces per frame
export const PIERCE_THRESHOLDS: [combo: number, pierce: number][] = [
  [20, 3],
  [10, 2],
  [5, 1],
];
export const PIERCE_COMBO_COST = 2;
