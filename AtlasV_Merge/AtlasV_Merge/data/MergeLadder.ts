/**
 * MergeLadder — Tier definitions for the Suika Merge Game.
 *
 * This is the ONLY file that needs editing to change tiers, colors, sizes, or scoring.
 * 11 tiers (0–10). Two same-tier items merge into one item of the next tier.
 * Tier 10 is the final tier and cannot merge further.
 */

export interface TierDef {
  /** Tier index (0–10) */
  readonly id: number;
  /** Display name for the tier */
  readonly name: string;
  /** Fill color hex string */
  readonly color: string;
  /** Circle radius in canvas pixels */
  readonly radius: number;
  /** Index of the tier this merges INTO, or -1 for final tier */
  readonly mergesInto: number;
  /** Score awarded when this tier is CREATED via merge */
  readonly score: number;
}

export const TIER_DEFS: readonly TierDef[] = [
  { id: 0, name: 'Bloblet',     color: '#E84890', radius: 16, mergesInto: 1,  score: 1 },
  { id: 1, name: 'Blobby',      color: '#FF4455', radius: 21, mergesInto: 2,  score: 3 },
  { id: 2, name: 'Blobert',     color: '#9B5DE5', radius: 25, mergesInto: 3,  score: 6 },
  { id: 3, name: 'Blorb',       color: '#FF8C06', radius: 32, mergesInto: 4,  score: 10 },
  { id: 4, name: 'Blobsworth',  color: '#DCA601', radius: 39, mergesInto: 5,  score: 15 },
  { id: 5, name: 'Blobzilla',   color: '#57CC55', radius: 48, mergesInto: 6,  score: 21 },
  { id: 6, name: 'Megablob',    color: '#22BBAA', radius: 58, mergesInto: 7,  score: 28 },
  { id: 7, name: 'Blobmaster',  color: '#FFADCC', radius: 69, mergesInto: 8,  score: 36 },
  { id: 8, name: 'Blobtitan',   color: '#FFD166', radius: 83, mergesInto: 9,  score: 45 },
  { id: 9, name: 'Blobemoth',   color: '#55AAFF', radius: 99, mergesInto: 10, score: 55 },
  { id: 10, name: 'Blob Royale', color: '#7B2FBE', radius: 115, mergesInto: -1, score: 66 },
];

/**
 * Spawn weight table for randomly choosing the held item tier.
 * Only the smallest tiers (0–4) can be spawned directly.
 * Weights are relative — higher = more likely.
 */
export interface SpawnWeight {
  readonly tier: number;
  readonly weight: number;
}

export const SPAWN_WEIGHTS: readonly SpawnWeight[] = [
  { tier: 0, weight: 35 },
  { tier: 1, weight: 28 },
  { tier: 2, weight: 20 },
  { tier: 3, weight: 12 },
  { tier: 4, weight: 5 },
];

/** Total weight for quick normalization */
export const TOTAL_SPAWN_WEIGHT: number = SPAWN_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);

/**
 * Pick a random tier based on spawn weights.
 * @param rand A random number in [0, 1)
 */
export function pickRandomTier(rand: number): number {
  let acc = 0;
  const target = rand * TOTAL_SPAWN_WEIGHT;
  for (const sw of SPAWN_WEIGHTS) {
    acc += sw.weight;
    if (target < acc) {
      return sw.tier;
    }
  }
  return SPAWN_WEIGHTS[SPAWN_WEIGHTS.length - 1].tier;
}
