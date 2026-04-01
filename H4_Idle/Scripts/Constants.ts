/**
 * Constants.ts — All tuning values and play-area dimensions.
 *
 * Rules:
 *   - ZERO imports from sibling files
 *   - Magic numbers belong here, not in gameplay code
 *   - Per-instance tuning uses @property() in the component instead
 */

// ─── Play Area ────────────────────────────────────────────────────────────────
// Portrait mobile: 9 × 16 world units, centered at origin (Y-up).
export const HALF_W   = 4.5;
export const HALF_H   = 8.0;
export const TOP_Y    = 8.0;
export const BOTTOM_Y = -8.0;

// ─── Click ────────────────────────────────────────────────────────────────────
/** Base gold earned per tap, before any upgrade multipliers. */
export const BASE_CLICK_VALUE = 1;

// ─── Passive Income ───────────────────────────────────────────────────────────
/** How often (seconds) GameManager fires Events.Tick to apply passive income. */
export const TICK_INTERVAL = 0.1;

// ─── Generator Cost Formula ───────────────────────────────────────────────────
/**
 * cost(n) = baseCost * costMultiplier^owned
 * Each generator def overrides costMultiplier individually.
 * Default if not specified in the def.
 */
export const DEFAULT_COST_MULTIPLIER = 1.15;

// ─── Crit ─────────────────────────────────────────────────────────────────────
/** Base probability of a crit on any gain (0–1). Does not apply to VaultPayout. */
export const BASE_CRIT_CHANCE = 0.05;
/** Base gold multiplier when a crit triggers. */
export const BASE_CRIT_MULTIPLIER = 2.5;

// ─── Frenzy ───────────────────────────────────────────────────────────────────
/** Number of taps required to trigger a frenzy. */
export const FRENZY_TAP_THRESHOLD = 25;
/** How long (seconds) frenzy mode lasts once triggered. */
export const FRENZY_DURATION = 10;
/** All-gain multiplier applied during an active frenzy. */
export const FRENZY_MULTIPLIER = 2;

// ─── Interest ─────────────────────────────────────────────────────────────────
/** Fraction of current gold paid as interest each interval (0.01 = 1%). */
export const BASE_INTEREST_RATE = 0.01;
/** Seconds between each interest payout. */
export const BASE_INTEREST_INTERVAL = 30;

// ─── Vault ────────────────────────────────────────────────────────────────────
/** Seconds the vault locks gold before it becomes collectible. */
export const BASE_VAULT_DURATION = 30;
/** Gold multiplier applied to the locked amount on collect (1.5 = +50% bonus). */
export const BASE_VAULT_BONUS = 1.5;

// ─── Camera ───────────────────────────────────────────────────────────────────
/** Delay in seconds before camera is initialized on session start. */
export const CAMERA_INIT_DELAY = 0.1;
