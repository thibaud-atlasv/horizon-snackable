/**
 * LevelConfig — per-wave and difficulty tuning.
 *
 * Extensibility:
 *   - Add new wave configs to WAVE_CONFIGS to create scripted encounters.
 *   - Override getWaveConfig() to drive custom logic (e.g. boss waves, themed waves).
 *   - FamilyFilter controls which fish families can spawn per-wave.
 */

export type FamilyFilter = 'all' | string[];

export interface WaveConfig {
  /** Fish count for this wave. */
  count: number;
  /** Speed multiplier applied to all fish in the wave. */
  speedMultiplier: number;
  /** Restrict which families can appear. 'all' = no restriction. */
  familyFilter: FamilyFilter;
  /** Optional: force a specific layer range for all fish (undefined = use def defaults). */
  layerOverride?: { min: number; max: number };
}

/**
 * Scripted wave configs. Index = waveIndex.
 * If waveIndex >= WAVE_CONFIGS.length, getWaveConfig() falls back to procedural generation.
 */
export const WAVE_CONFIGS: WaveConfig[] = [
  // Wave 0 — tutorial: slow surface fish only
  { count: 5, speedMultiplier: 0.7, familyFilter: ['Solars', 'Corals'], layerOverride: { min: 0, max: 3 } },
  // Wave 1 — normal start
  { count: 5, speedMultiplier: 1.0, familyFilter: 'all' },
  // Wave 2 — slightly faster
  { count: 5, speedMultiplier: 1.1, familyFilter: 'all' },
];

/**
 * Returns the config for a given wave index.
 * Procedurally generated beyond the scripted list.
 */
export function getWaveConfig(waveIndex: number, currentSpeedMul: number): WaveConfig {
  if (waveIndex < WAVE_CONFIGS.length) return WAVE_CONFIGS[waveIndex];
  return {
    count:          5,
    speedMultiplier: currentSpeedMul,
    familyFilter:   'all',
  };
}
