/**
 * FishDefs — static catalog of all catchable species.
 *
 * depthMin = world Y at which the species starts appearing (absent = surface).
 * No depthMax — all species remain eligible at any depth below their depthMin.
 * The wave formula creates natural density cycles so they're not uniform forever.
 */
import { Assets } from './Assets';
import type { IFishDef } from './Types';

// Wave formula per slot:
//   wave = sin(depth/wave1Period + wave1Offset) × sin(depth/wave2Period + wave2Offset)
//   effectiveChance = spawnChance × max(0, wave)
//
// Period ratios use irrational numbers (√2, √3, φ) so biome patterns never repeat.
//   √2 ≈ 1.4142   √3 ≈ 1.7321   φ ≈ 1.6180

export const FISH_DEFS: IFishDef[] = [

  // ── Shallow ──────────────────────────────────────────────────────────────────
  { id:  1, name: 'Clownfish',        rarity: 'common',    gold:  5,
    spawnChance: 0.70, depthMin: 0,
    wave1Period: 18,    wave1Offset: 0.0,
    wave2Period: 25.46, wave2Offset: 1.1,   // 18 × √2
    sizeMin: 0.7, sizeMax: 1.1, speedMin: 1.2, speedMax: 2.2, template: Assets.ClownFish  },

  { id:  2, name: 'Koi',              rarity: 'common',    gold:  6,
    spawnChance: 0.65, depthMin: 0,
    wave1Period: 22,    wave1Offset: 1.8,
    wave2Period: 38.10, wave2Offset: 0.4,   // 22 × √3
    sizeMin: 1.1, sizeMax: 1.7, speedMin: 0.8, speedMax: 1.6, template: Assets.Fish_1     },

  { id:  3, name: 'Blue Discus',      rarity: 'common',    gold:  8,
    spawnChance: 0.60, depthMin: -5,
    wave1Period: 15,    wave1Offset: 0.9,
    wave2Period: 24.27, wave2Offset: 2.3,   // 15 × φ
    sizeMin: 1.0, sizeMax: 1.5, speedMin: 0.6, speedMax: 1.2, template: Assets.Fish_2     },

  { id:  4, name: 'Butterflyfish',    rarity: 'rare',      gold: 15,
    spawnChance: 0.45, depthMin: -5,
    wave1Period: 30,    wave1Offset: 2.5,
    wave2Period: 42.43, wave2Offset: 0.7,   // 30 × √2
    sizeMin: 1.1, sizeMax: 1.6, speedMin: 1.0, speedMax: 1.8, template: Assets.AngelFish  },

  { id:  5, name: 'Angelfish',        rarity: 'rare',      gold: 18,
    spawnChance: 0.40, depthMin: -10,
    wave1Period: 35,    wave1Offset: 1.3,
    wave2Period: 56.62, wave2Offset: 3.0,   // 35 × φ
    sizeMin: 1.1, sizeMax: 1.7, speedMin: 0.7, speedMax: 1.4, template: Assets.Fish_3     },

  { id:  6, name: 'Rainbow Fish',     rarity: 'legendary', gold: 25,
    spawnChance: 0.55, depthMin: 0,
    wave1Period: 50,    wave1Offset: 0.3,
    wave2Period: 86.60, wave2Offset: 1.7,   // 50 × √3
    sizeMin: 0.8, sizeMax: 1.2, speedMin: 2.0, speedMax: 3.2, template: Assets.RainbowFish },

  // ── Mid ───────────────────────────────────────────────────────────────────────
  { id:  7, name: 'Silver Carp',      rarity: 'common',    gold: 10,
    spawnChance: 0.65, depthMin: -15,
    wave1Period: 28,    wave1Offset: 0.6,
    wave2Period: 39.60, wave2Offset: 2.1,   // 28 × √2
    sizeMin: 1.4, sizeMax: 2.1, speedMin: 0.9, speedMax: 1.7, template: Assets.Fish_1v2   },

  { id:  8, name: 'Green Discus',     rarity: 'common',    gold: 12,
    spawnChance: 0.60, depthMin: -20,
    wave1Period: 32,    wave1Offset: 1.5,
    wave2Period: 51.78, wave2Offset: 0.2,   // 32 × φ
    sizeMin: 1.2, sizeMax: 1.8, speedMin: 0.6, speedMax: 1.2, template: Assets.Fish_2v2   },

  { id:  9, name: 'Dolphin',          rarity: 'common',    gold: 16,
    spawnChance: 0.55, depthMin: -25,
    wave1Period: 24,    wave1Offset: 3.1,
    wave2Period: 41.57, wave2Offset: 1.4,   // 24 × √3
    sizeMin: 1.8, sizeMax: 2.6, speedMin: 1.6, speedMax: 2.8, template: Assets.Dolphin    },

  { id: 10, name: 'Flame Angelfish',  rarity: 'rare',      gold: 22,
    spawnChance: 0.45, depthMin: -20,
    wave1Period: 45,    wave1Offset: 2.2,
    wave2Period: 63.64, wave2Offset: 0.9,   // 45 × √2
    sizeMin: 1.2, sizeMax: 1.8, speedMin: 1.0, speedMax: 1.8, template: Assets.Fish_3v2   },

  { id: 11, name: 'Sand Flounder',    rarity: 'rare',      gold: 28,
    spawnChance: 0.40, depthMin: -30,
    wave1Period: 40,    wave1Offset: 0.8,
    wave2Period: 69.28, wave2Offset: 2.6,   // 40 × √3
    sizeMin: 1.4, sizeMax: 2.1, speedMin: 0.5, speedMax: 1.0, template: Assets.Fish_5v2   },

  { id: 12, name: 'Sea Turtle',       rarity: 'legendary', gold: 45,
    spawnChance: 0.60, depthMin: -20,
    wave1Period: 70,    wave1Offset: 1.1,
    wave2Period: 113.2, wave2Offset: 0.5,   // 70 × φ
    sizeMin: 2.2, sizeMax: 3.2, speedMin: 0.4, speedMax: 0.9, template: Assets.Tortoise   },

  // ── Deep ──────────────────────────────────────────────────────────────────────
  { id: 13, name: 'Violet Barracuda', rarity: 'common',    gold: 22,
    spawnChance: 0.60, depthMin: -55,
    wave1Period: 38,    wave1Offset: 2.8,
    wave2Period: 53.78, wave2Offset: 1.0,   // 38 × √2
    sizeMin: 1.6, sizeMax: 2.4, speedMin: 1.8, speedMax: 3.0, template: Assets.Fish_4v2   },

  { id: 14, name: 'Blue Flounder',    rarity: 'common',    gold: 28,
    spawnChance: 0.55, depthMin: -60,
    wave1Period: 42,    wave1Offset: 0.4,
    wave2Period: 67.95, wave2Offset: 2.9,   // 42 × φ
    sizeMin: 1.4, sizeMax: 2.1, speedMin: 0.5, speedMax: 1.0, template: Assets.Fish_5     },

  { id: 15, name: 'Reef Shark',       rarity: 'common',    gold: 38,
    spawnChance: 0.50, depthMin: -70,
    wave1Period: 34,    wave1Offset: 1.6,
    wave2Period: 58.90, wave2Offset: 0.3,   // 34 × √3
    sizeMin: 2.4, sizeMax: 3.4, speedMin: 1.4, speedMax: 2.4, template: Assets.Sharkv2    },

  { id: 16, name: 'Pink Dolphin',     rarity: 'rare',      gold: 50,
    spawnChance: 0.50, depthMin: -60,
    wave1Period: 60,    wave1Offset: 3.0,
    wave2Period: 84.85, wave2Offset: 1.2,   // 60 × √2
    sizeMin: 1.8, sizeMax: 2.6, speedMin: 1.6, speedMax: 2.8, template: Assets.Dolphinv2  },

  { id: 17, name: 'Barracuda',        rarity: 'rare',      gold: 65,
    spawnChance: 0.45, depthMin: -80,
    wave1Period: 55,    wave1Offset: 1.9,
    wave2Period: 88.99, wave2Offset: 2.4,   // 55 × φ
    sizeMin: 1.6, sizeMax: 2.4, speedMin: 1.8, speedMax: 3.0, template: Assets.Fish_4     },

  { id: 18, name: 'Pink Shark',       rarity: 'legendary', gold: 100,
    spawnChance: 0.70, depthMin: -100,
    wave1Period: 90,    wave1Offset: 0.7,
    wave2Period: 155.88, wave2Offset: 1.8,  // 90 × √3
    sizeMin: 2.8, sizeMax: 4.0, speedMin: 2.0, speedMax: 3.4, template: Assets.Shark      },

];
