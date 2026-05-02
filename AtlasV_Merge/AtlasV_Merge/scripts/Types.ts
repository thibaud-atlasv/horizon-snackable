/**
 * Types and interfaces for the Suika Merge Game.
 */

/** Current state of the game */
export enum GameState {
  Playing = 0,
  GameOver = 1,
}

/** A single game item (circle) in the container */
export interface GameItem {
  /** Unique numeric ID for tracking */
  id: number;
  /** Tier index (0–10), references TIER_DEFS */
  tier: number;
  /** Center X in canvas pixels */
  x: number;
  /** Center Y in canvas pixels */
  y: number;
  /** Horizontal velocity in px/s */
  vx: number;
  /** Vertical velocity in px/s */
  vy: number;
  /** Circle radius (copied from tier def for quick access) */
  radius: number;
  /** Seconds remaining of merge protection (newly merged items can't merge again immediately) */
  mergeCooldown: number;
  /** Scale animation progress (0 to 1, for pop-in effect on merge) */
  scaleAnim: number;
  /** Current rotation angle in radians */
  angle: number;
  /** Angular velocity in radians/second */
  angularVelocity: number;

  // === Squash & Stretch (Spring-Based) ===
  /** Horizontal squash/stretch scale factor (1.0 = normal) */
  squashX: number;
  /** Vertical squash/stretch scale factor (1.0 = normal) */
  squashY: number;
  /** Decay rate for squash — legacy field, kept for compatibility but unused by spring system */
  squashDecay: number;
  /** Squash spring velocity X (px/s toward equilibrium) */
  squashVelX: number;
  /** Squash spring velocity Y (px/s toward equilibrium) */
  squashVelY: number;

  // === Merge Animation ===
  /** Whether this item is currently being consumed by a merge animation */
  merging: boolean;

  // === Idle motion ===
  /** Phase offset for idle sine wave (randomized per item) */
  idlePhase: number;
  /** Previous frame vertical velocity — used to detect landing */
  prevVy: number;
}

/** A floating "+points" tag shown at merge location */
export interface FloatingTag {
  /** Center X in canvas pixels */
  x: number;
  /** Center Y in canvas pixels (moves upward over time) */
  y: number;
  /** Display text, e.g. "+10" */
  text: string;
  /** Current opacity (1.0 = fully visible, fades to 0) */
  alpha: number;
  /** Remaining lifetime in seconds */
  timer: number;
}

// ============================================================
// MERGE ANIMATION TYPES
// ============================================================

/** Phase of a multi-step merge animation */
export enum MergePhase {
  /** Two items squish toward each other (~0.12s) */
  Compress = 0,
  /** Brief bright flash at merge point (~0.08s) */
  Flash = 1,
  /** New item scales in with overshoot (~0.25s) */
  PopIn = 2,
}

/** Tracks the state of one in-progress merge animation */
export interface MergeAnimation {
  phase: MergePhase;
  /** Time remaining in current phase (seconds) */
  timer: number;
  /** Merge point X */
  midX: number;
  /** Merge point Y */
  midY: number;
  /** ID of first merging item */
  itemAId: number;
  /** ID of second merging item */
  itemBId: number;
  /** Tier of the resulting item */
  newTier: number;
  /** Color hex for flash/particles */
  colorHex: string;
  /** Chain depth for effects scaling */
  chainDepth: number;

  // Compress phase: track original positions for lerp
  aStartX: number;
  aStartY: number;
  bStartX: number;
  bStartY: number;

  // PopIn phase: spring-based scale overshoot
  popScale: number;
  popVelocity: number;
  /** ID of the spawned new item (set when entering PopIn phase) */
  newItemId: number;
  /** Flash brightness (1→0 during Flash/PopIn phases) */
  flashAlpha: number;
}
