// ─── Play Area ────────────────────────────────────────────────────────────────
// Portrait mobile: 9 × 16 world units, centered at origin (Y-up).
export const HALF_W = 4.5;

// ─── Water ────────────────────────────────────────────────────────────────────
export const WATER_SURFACE_Y = 4.5;

// ─── Fish spawn bounds (world X) ─────────────────────────────────────────────
export const FISH_LEFT  = -5.5;
export const FISH_RIGHT =  5.5;

// ─── Hook idle position (tip of rod) ─────────────────────────────────────────
export const TIP_X       = -2.85;
export const TIP_Y       =  7.15;
export const HOOK_IDLE_X =  TIP_X;
export const HOOK_IDLE_Y =  WATER_SURFACE_Y + 0.2;

// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLOR_LINE       = { r: 0.95, g: 0.95, b: 0.82 };
export const COLOR_LINE_WATER = { r: 0.78, g: 0.90, b: 1.00 };
export const COLOR_BUBBLE     = { r: 0.85, g: 0.95, b: 1.00 };

// ─── Cast physics ─────────────────────────────────────────────────────────────
export const CAST_CENTER_VX      =  2.5;   // base rightward velocity; lands hook near center from TIP_X=-2.5
export const CAST_VX_RANDOM      =  1.0;   // ± random spread applied at cast moment
export const CAST_VX_MIN         =  1.2;   // absolute floor so the arc never goes straight up
export const CAST_VY             = 12.0;   // initial upward velocity on cast
export const CAST_GRAVITY        = -16.0;  // gravity applied during cast arc
 
// ─── Dive physics ─────────────────────────────────────────────────────────────
export const DIVE_SPEED          =  6.0;   // terminal descent speed once arc ends (units/s)
export const DIVE_MAX_DEPTH      =  15.0;   // default (line level 0); runtime uses lineDepthAtLevel
export const DIVE_SWIPE_FORCE    = 18.0;   // X velocity impulse per swipe unit (screen-space → world)
export const DIVE_X_DRAG         =  1.8;   // horizontal drag during dive
export const DIVE_BOUNCE         =  0.55;  // velocity restitution on wall bounce (0=dead, 1=perfect)
export const DIVE_CENTER_PULL    =  1.2;   // gentle spring force pulling hook toward center X
export const HOOK_MAX_FISH       = 3;      // default (hook level 0); runtime uses HOOK_MAX_FISH_LEVELS
export const HOOK_COLLECT_RADIUS = 0.9;    // collision radius multiplier (× fish size)

// ─── Surface physics ─────────────────────────────────────────────────────────
export const SURFACE_SPEED       = 30.0;  // units/s upward during Surfacing

// ─── Launch physics (reward anim) ────────────────────────────────────────────
export const LAUNCH_VY_MIN       = 12.0;  // min upward velocity per fish
export const LAUNCH_VY_MAX       = 18.0;  // max upward velocity per fish
export const LAUNCH_VX_SPREAD    =  4.0;  // ± horizontal spread
export const LAUNCH_GRAVITY      = -9.0;  // gravity applied during launch arc
export const LAUNCH_STAGGER      =  0.08; // seconds between each fish launch
export const LAUNCH_EXIT_Y       = 10.0;  // Y above which a fish is considered "collected"
export const LAUNCH_TIMEOUT      =  4.0;  // max seconds before AllFishCollected fires regardless

// ─── Camera ───────────────────────────────────────────────────────────────────
export const HALF_SCREEN_WORLD_HEIGHT = 8.0;  // half-height of viewport in world units

// ─── Timing ───────────────────────────────────────────────────────────────────
export const RESET_DELAY  = 0.5;

// ─── Fish pool ────────────────────────────────────────────────────────────────
// Pool counts per rarity (× number of species per rarity = total entities)
// common: 6 species × 7 = 42  rare: 6 × 5 = 30  legendary: 6 × 3 = 18  → 90 total
export const POOL_COUNT_COMMON    = 5;
export const POOL_COUNT_RARE      = 3;
export const POOL_COUNT_LEGENDARY = 1;

// Recycle margin: fish this far above camTop are teleported below camBottom
export const POOL_RECYCLE_MARGIN  = 3.0;
// Interval between activating a new fish from the bench (seconds)
export const POOL_SPAWN_INTERVAL  = 0.3;
// Number of fish activated immediately at game start to fill the visible area
export const POOL_BURST_COUNT     = 10;

// ─── Bubbles ─────────────────────────────────────────────────────────────────
export const BUBBLE_RISE_SPEED_MIN  = 0.22;
export const BUBBLE_RISE_SPEED_MAX  = 0.65;
export const BUBBLE_SCALE_MIN       = 0.04;
export const BUBBLE_SCALE_MAX       = 0.15;
export const BUBBLE_INTERVAL_MIN    = 8.0;
export const BUBBLE_INTERVAL_MAX    = 15.0;
export const BUBBLE_LIFETIME_MIN    = 2.5;
export const BUBBLE_LIFETIME_MAX    = 6.5;
export const BUBBLE_SPAWN_OFFSET_X  = 0.35;
export const BUBBLE_SPAWN_OFFSET_Y  = 0.10;

// ─── Flash ────────────────────────────────────────────────────────────────────
export const FLASH_DUR = 0.22;

// ─── Upgrades ─────────────────────────────────────────────────────────────────
// All upgrade formulas use level n (1-based, n=0 means no upgrade bought yet).

export const LINE_MAX_LEVEL  = 100;
export const HOOK_MAX_LEVEL  =  90;

/** Max dive depth at upgrade level n. depth(0)=15, each level adds 16 (one full screen). */
export function lineDepthAtLevel(n: number): number {
  return 15 + n * 16;
}

/** Max fish per run at hook upgrade level n. fish(0)=1, fish(90)=90. */
export function hookMaxFishAtLevel(n: number): number {
  return n + 1;
}

/** Gold cost to buy upgrade level n (1-based). cost(1)=8g, cost(100)≈50k. */
export function upgradeCost(n: number): number {
  return Math.floor(8 * Math.pow(n, 1.9));
}

// Gold reward per rarity on catch
export const GOLD_REWARD_COMMON    = 5;
export const GOLD_REWARD_RARE      = 15;
export const GOLD_REWARD_LEGENDARY = 40;

// ─── GoldCoins Canvas (GoldCoinsAnimator entity) ──────────────────────────────
// Canvas design is 600×600 px (square). The entity is placed at
// (0, CANVAS_CENTER_WORLD_Y, -0.1) and scaled uniformly to CANVAS_ENTITY_SCALE.
// Tune CANVAS_ENTITY_SCALE until the canvas visually covers the above-water area.
export const CANVAS_SIZE           = 600;   // design px
export const CANVAS_WORLD_SPAN     = 12.0;  // world units the canvas covers on each axis
export const CANVAS_CENTER_WORLD_Y = 7.0;   // world Y at canvas center (covers ~Y 1–13)
export const CANVAS_ENTITY_SCALE   = 12.0;  // uniform entity scale (1 unit ≈ 1 world unit — tune me)

// ─── Zone progression ─────────────────────────────────────────────────────────
export const ZONE_COUNT             =  3;
export const ZONE_FLOOR_Y           = [-8.5, -24.5, -38.5] as readonly number[];
export const ZONE_SPAWN_TOP_Y       = [4.0,  -9.5, -25.5]  as readonly number[];
export const ZONE_SPAWN_BOT_Y       = [-8.5, -24.5, -38.5] as readonly number[];
export const FISH_MAX_PER_ZONE      =  5;
export const FISH_RESPAWN_INTERVAL  = 30;
export const UNLOCK_ZONE_2_UNIQUE   =  3;
export const UNLOCK_ZONE_3_UNIQUE   =  7;
export const BAIT_IDLE_X            = HOOK_IDLE_X;
export const BAIT_IDLE_Y            = HOOK_IDLE_Y;
