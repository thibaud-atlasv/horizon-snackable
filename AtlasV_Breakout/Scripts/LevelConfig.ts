import { TemplateAsset } from 'meta/worlds';
import { PowerUpType, type RGB, type BrickColorPalette } from './Types';
import { BrickAssets } from './Assets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

export type ColorPalette = {
  /** Ball color. */
  ball?: RGB;
  /** Base paddle color (restored after an effect ends). */
  paddle?: RGB;
  /** Background color. */
  background?: RGB;
};

/** Palette used when none is defined in the level. */
export const DEFAULT_PALETTE: Required<ColorPalette> = {
  ball:       [1.00, 1.00, 1.00],
  paddle:     [1.00, 1.00, 1.00],
  background: [0.04, 0.04, 0.06], // near black
};

export type BrickTemplate = {
  asset: TemplateAsset;
  /** Number of hits to destroy the brick. Default: 1 */
  hits?: number;
  /** If true, the brick can never be destroyed. Default: false */
  indestructible?: boolean;
  /** Colors keyed by remaining HP. Takes priority over the level palette. */
  colors?: BrickColorPalette;
};

export type PowerUpConfig = {
  type: PowerUpType;
  /** Relative weight. Ex: { BigPaddle:2, Sticky:1 } = 2/3 chance BigPaddle */
  weight: number;
  powerUpDuration?: number;
};

export type GameplaySettings = {
  /** Multiplier on ball scale. Default: 1 */
  ballSizeMultiplier?: number;
  /** Multiplier on paddle width. Default: 1 */
  paddleWidthMultiplier?: number;
};

export type VictoryCondition =
  | { kind: 'allBricksDestroyed' }
  | { kind: 'bricksDestroyed'; count: number }
  | { kind: 'survivalTime'; seconds: number };

export type PhysicsSettings = {
  /** Multiplier applied to the base ball speed. Default: 1 */
  ballSpeedMultiplier?: number;
  /** Downward acceleration (units/s²). 0 = no gravity. Default: 0 */
  gravity?: number;
  /**
   * Angular variance on bounces (0–1 mapped to 0–90°).
   * 0 = deterministic, 0.1 = slight chaos. Default: 0
   */
  bounceRandomness?: number;
  /** Multiplier applied to the base paddle speed. Default: 1 */
  paddleSpeedMultiplier?: number;
  /** Lerp factor for paddle movement per frame (0 = still, 1 = snap). Default: 1 */
  paddleLerpFactor?: number;
  /** Speed bonus added to the ball for each brick destroyed. Default: 0 */
  ballSpeedIncrementPerBrick?: number;
};

export type LevelConfig = {
  /**
   * Char → brick template mapping.
   * '0' and ' ' are always empty cells (no need to declare them).
   * Each other unique character = a distinct brick type.
   */
  brickTemplates: Record<string, BrickTemplate>;

  /**
   * ASCII grid. Rows separated by '\n'.
   * Each character maps to a key in brickTemplates, or '0'/' ' for empty.
   * Example: "121\n212\n121"
   */
  grid: string;

  // --- Layout ---
  /** Width of a brick cell. Default: 1.2 */
  brickWidth?: number;
  /** Height of a brick cell. Default: 0.4 */
  brickHeight?: number;
  /** Horizontal gap between bricks. Default: 0.1 */
  paddingX?: number;
  /** Vertical gap between bricks. Default: 0.1 */
  paddingY?: number;
  /** Y coordinate of the center of the first row. Default: 4 */
  startY?: number;

  // --- Power-ups ---
  /** Probability (0–1) that a destroyed brick spawns a power-up. Default: 0.2 */
  powerUpSpawnChance?: number;
  /** Selection weights per power-up type. Default: equal weights. */
  powerUps?: PowerUpConfig[];

  // --- Victory ---
  /** Condition to advance to the next level. Default: allBricksDestroyed */
  victory?: VictoryCondition;

  // --- Physics ---
  physics?: PhysicsSettings;

  // --- Gameplay ---
  /** Ball and paddle size for this level. */
  gameplay?: GameplaySettings;

  // --- Colors ---
  /** Level color palette. Missing values fall back to DEFAULT_PALETTE. */
  palette?: ColorPalette;

  // --- Lives ---
  /** Overrides the life count for this level only. undefined = global value. */
  livesOverride?: number;
};

// ---------------------------------------------------------------------------
// Default values (used by components during initialization)
// ---------------------------------------------------------------------------

export const LEVEL_DEFAULTS = {
  brickWidth: 1.2,
  brickHeight: 0.4,
  paddingX: 0.1,
  paddingY: 0.1,
  startY: 4,
  powerUpSpawnChance: 0.2,
  powerUpDuration: 10,
  ballSpeedMultiplier: 1,
  gravity: 0,
  bounceRandomness: 0,
  paddleSpeedMultiplier: 1,
  paddleLerpFactor: 1,
  ballSpeedIncrementPerBrick: 0,
  ballSizeMultiplier: 1,
  paddleWidthMultiplier: 1,
} as const;

// ---------------------------------------------------------------------------
// Level data
// ---------------------------------------------------------------------------

export const LEVELS: LevelConfig[] = [

  // ── Level 0: Arcade ───────────────────────────────────────────────────────
  //
  //   P P P P P P P P   ← 1hp #ff148a  rose
  //   O O O O O O O O   ← 1hp #FF7300  orange
  //   J J J J J J J J   ← 1hp #FFEB00  jaune
  //   V V V V V V V V   ← 1hp #1EF34D  vert
  //   B B B B B B B B   ← 1hp #008CFF  bleu
  //   M M M M M M M M   ← 1hp #B81AFF  mauve
  //
  {
    brickTemplates: {
      'P': { asset: BrickAssets.Normal, hits: 3, colors: { 3: [1.000, 0.3254, 0.5647], 2: [1.000, 0.901, 0.000], 1: [0.000, 0.784, 1.000] } }, // rose
      'O': { asset: BrickAssets.Normal, hits: 3, colors: { 3: [1.000, 0.419, 0.207], 2: [0.223, 1.000, 0.078], 1: [0.654, 0.545, 0.980] } }, // orange
      'J': { asset: BrickAssets.Normal, hits: 2, colors: { 2: [1.000, 0.901, 0.000], 1: [0.000, 0.784, 1.000] } }, // jaune
      'V': { asset: BrickAssets.Normal, hits: 2, colors: { 2: [0.223, 1.000, 0.078], 1: [0.654, 0.545, 0.980] } }, // vert
      'B': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.000, 0.784, 1.000] } }, // bleu
      'M': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.654, 0.545, 0.980] } }, // mauve
    },
    grid: [
      'PPPPPPPP',
      'OOOOOOOO',
      'JJJJJJJJ',
      'VVVVVVVV',
      'BBBBBBBB',
      'MMMMMMMM',
    ].join('\n'),
    brickWidth: 1.00, brickHeight: 0.80, paddingX: 0.11, paddingY: 0.11, startY: 6.5,
    powerUpSpawnChance: 0.25,
    powerUps: [
      { type: PowerUpType.BigPaddle,    weight: 2, powerUpDuration: 10 },
      { type: PowerUpType.StickyPaddle, weight: 1, powerUpDuration: 8  },
    ],
    physics: {
      ballSpeedMultiplier: 1,
      paddleLerpFactor: 0.88,
      ballSpeedIncrementPerBrick: 0.2,
    },
    palette: {
      background: [0.027, 0.031, 0.059], // #07080F
      ball:       [1.000, 1.000, 1.000], // #FFFFFF
      paddle:     [0.000, 0.961, 1.000], // #00F5FF
    },
  },

  // ── Level 1: Diamond ──────────────────────────────────────────────────────
  //
  //   . . . . 1 . . . .
  //   . . . 1 1 1 . . .
  //   . . 1 1 1 1 1 . .
  //   . 1 1 1 1 1 1 1 .
  //   1 1 1 1 1 1 1 1 1
  //   . 1 1 1 1 1 1 1 .
  //   . . 1 1 1 1 1 . .
  //   . . . 1 1 1 . . .
  //   . . . . 1 . . . .
  //
  {
    brickTemplates: {
      '1': { asset: BrickAssets.Normal, hits: 1 },
    },
    grid: [
      '000010000',
      '000111000',
      '001111100',
      '011111110',
      '111111111',
      '011111110',
      '001111100',
      '000111000',
      '000010000',
    ].join('\n'),
    brickWidth: 0.9, brickHeight: 0.4, paddingX: 0.05, paddingY: 0.1, startY: 6.5,
    powerUpSpawnChance: 0.2,
    powerUps: [
      { type: PowerUpType.BigPaddle,    weight: 2, powerUpDuration: 12 },
      { type: PowerUpType.StickyPaddle, weight: 1, powerUpDuration: 8  },
    ],
    palette: {
      background:   [0.02, 0.04, 0.12], // night blue
      ball:         [0.88, 0.97, 1.00], // icy blue
      paddle:       [0.22, 0.62, 0.92], // sky blue
    },
    // standard sizes for the introduction
  },

  // ── Level 2: Fortress ─────────────────────────────────────────────────────
  //
  //   2 2 2 2 2 2 2 2 2   ← outer wall (2 hits)
  //   2 . . . . . . . 2
  //   2 . 1 1 1 1 1 . 2   ← interior (1 hit)
  //   2 1 1 1 1 1 1 1 2
  //   2 . 1 1 1 1 1 . 2
  //   2 . . . . . . . 2
  //   2 2 2 2 2 2 2 2 2
  //
  {
    brickTemplates: {
      '1': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.40, 0.88, 0.30] } }, // lime
      '2': { asset: BrickAssets.Normal, hits: 2 },
    },
    grid: [
      '222222222',
      '200000002',
      '201111102',
      '211111112',
      '201111102',
      '200000002',
      '222222222',
    ].join('\n'),
    brickWidth: 0.9, brickHeight: 0.4, paddingX: 0.05, paddingY: 0.1, startY: 6.5,
    powerUpSpawnChance: 0.25,
    powerUps: [
      { type: PowerUpType.BigPaddle,    weight: 1, powerUpDuration: 10 },
      { type: PowerUpType.StickyPaddle, weight: 3, powerUpDuration: 6  },
    ],
    physics: { ballSpeedMultiplier: 1.15 },
    palette: {
      background:   [0.02, 0.07, 0.03], // green night
      ball:         [0.98, 0.92, 0.68], // warm cream
      paddle:       [0.15, 0.72, 0.40], // forest green
    },
    gameplay: {
      paddleWidthMultiplier: 0.88, // slightly narrower paddle
    },
  },

  // ── Level 3: Target ───────────────────────────────────────────────────────
  //
  //   3 3 3 3 3 3 3 3 3   ← outer ring  (3 hits)
  //   3 2 2 2 2 2 2 2 3   ← middle ring (2 hits)
  //   3 2 1 1 1 1 1 2 3   ← inner ring  (1 hit)
  //   3 2 1 . . . 1 2 3   ← empty center
  //   3 2 1 1 1 1 1 2 3
  //   3 2 2 2 2 2 2 2 3
  //   3 3 3 3 3 3 3 3 3
  //
  {
    brickTemplates: {
      '1': { asset: BrickAssets.Normal, hits: 1 },
      '2': { asset: BrickAssets.Normal, hits: 2 },
      '3': { asset: BrickAssets.Normal, hits: 3 },
    },
    grid: [
      '333333333',
      '322222223',
      '321111123',
      '321000123',
      '321111123',
      '322222223',
      '333333333',
    ].join('\n'),
    brickWidth: 0.9, brickHeight: 0.4, paddingX: 0.05, paddingY: 0.1, startY: 6.5,
    powerUpSpawnChance: 0.35,
    powerUps: [
      { type: PowerUpType.BigPaddle,    weight: 2, powerUpDuration: 10 },
      { type: PowerUpType.StickyPaddle, weight: 1, powerUpDuration: 5  },
    ],
    victory: { kind: 'bricksDestroyed', count: 35 },
    physics: {
      ballSpeedMultiplier: 1.3,
      gravity: 1.2,
      bounceRandomness: 0.06,
    },
    palette: {
      background:         [0.04, 0.01, 0.10], // deep space
      ball:               [0.05, 0.92, 0.88], // electric cyan
      paddle:             [0.18, 0.42, 0.98], // electric blue
    },
    gameplay: {
      ballSizeMultiplier:   0.82, // smaller ball
      paddleWidthMultiplier: 0.80, // narrower paddle
    },
  },

];
