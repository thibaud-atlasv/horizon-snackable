// ─── Grid ─────────────────────────────────────────────────────────────────────

export const GRID_COLS = 18;
export const GRID_ROWS = 24;
export const CELL_SIZE = 0.5; // world units per cell

// col → Z axis (horizontal, left/right on screen)
// row → X axis (vertical, top/bottom on screen)
export const GRID_ORIGIN_X = -((GRID_ROWS - 1) / 2) * CELL_SIZE; // -5.5 — top row X
export const GRID_ORIGIN_Z = -((GRID_COLS - 1) / 2) * CELL_SIZE; // -4.0 — left col Z

// Y position for ground-level entities (towers, enemies, tiles)
export const GROUND_Y = 0;

// ─── Wave timing ──────────────────────────────────────────────────────────────

export const WAVE_BUILD_DURATION   = 5;    // seconds of build phase before wave starts
export const WAVE_CLEAR_DURATION   = 0.5;  // seconds between last kill and next build phase
export const ENEMY_SPAWN_INTERVAL  = 0.35; // seconds between enemy spawns within a wave

// ─── Economy ──────────────────────────────────────────────────────────────────

export const START_GOLD  = 150;
export const START_LIVES = 20;
export const WAVE_BONUS_GOLD = 25; // flat gold awarded at end of each wave

// ─── Enemy scaling ────────────────────────────────────────────────────────────

export const HP_SCALE_PER_WAVE = 0.15; // HP multiplier = 1 + waveIndex * HP_SCALE_PER_WAVE

// ─── Economy (continued) ──────────────────────────────────────────────────────

export const SELL_RATIO = 0.6; // fraction of totalInvested refunded on sell

// ─── Projectile ───────────────────────────────────────────────────────────────

export const PATH_TILE_POOL_SIZE   = 220; // max path cells (BFS can meander across full grid)
export const PROJECTILE_HIT_RADIUS = 0.3; // world units — distance to trigger hit detection
export const PROJECTILE_SCALE      = 0.25; // world units — visual size of spawned projectiles
export const PROJECTILE_POOL_SIZE  = 30;   // pre-spawned projectile instances
export const PROJECTILE_POOL_Y     = -100; // off-screen park position Y
export const HEALTHBAR_POOL_SIZE   = 30;   // pre-spawned health bar instances
export const HEALTHBAR_OFFSET_X    = 0.35; // world units ahead of enemy (X axis)
export const HEALTHBAR_WIDTH       = 0.4;  // world units (matches cell size)
export const HEALTHBAR_HEIGHT      = 0.06; // world units (thin bar)
export const HEALTHBAR_DEPTH       = 0.02; // world units (flat)

// ─── Theme colors ────────────────────────────────────────────────────────────

export const GROUND_COLOR    = '#212126'; // dark teal
export const PATH_CELL_COLOR = '#80522E'; // warm sand

/** Convert a CSS hex color string to normalized { r, g, b } in [0, 1]. */
export function hexColor(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

// ─── Crit ─────────────────────────────────────────────────────────────────────

export const CRIT_MULTIPLIER = 2.5;

// ─── Floating Text ────────────────────────────────────────────────────────────
export const FLOATING_TEXT_POOL_SIZE = 10;   // pre-spawned floating text instances
export const FLOATING_TEXT_PARK_Y    = -100; // off-screen park position Y
