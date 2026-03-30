/**
 * FishDefs — static catalog of all catchable species.
 *
 * FISH_DEFS — core data (id, zone, rarity, size/speed range, template to spawn).
 *             Read by FishSpawnService to choose what to spawn per zone.
 *
 * To add a species: copy an entry and change the values.
 * Zone 1: Y  4.5 to  -8.0 (surface water)
 * Zone 2: Y -8.0 to -24.0 (mid-depth)
 * Zone 3: Y -24.0 to -40.0 (abyss)
 *
 * Per zone: 3 common · 2 rare · 1 legendary
 */
import { Assets } from '../Assets';
import type { IFishDef } from '../Types';

export const FISH_DEFS: IFishDef[] = [

  // ── Zone 1 — Surface ─────────────────────────────────────────────────────────
  { id:  1, name: 'Clownfish',        zone: 1, rarity: 'common',    sizeMin: 0.7, sizeMax: 1.1, speedMin: 1.2, speedMax: 2.2, template: Assets.ClownFish  },
  { id:  2, name: 'Koi',              zone: 1, rarity: 'common',    sizeMin: 1.1, sizeMax: 1.7, speedMin: 0.8, speedMax: 1.6, template: Assets.Fish_1     },
  { id:  3, name: 'Blue Discus',      zone: 1, rarity: 'common',    sizeMin: 1.0, sizeMax: 1.5, speedMin: 0.6, speedMax: 1.2, template: Assets.Fish_2     },
  { id:  4, name: 'Butterflyfish',    zone: 1, rarity: 'rare',      sizeMin: 1.1, sizeMax: 1.6, speedMin: 1.0, speedMax: 1.8, template: Assets.AngelFish  },
  { id:  5, name: 'Angelfish',        zone: 1, rarity: 'rare',      sizeMin: 1.1, sizeMax: 1.7, speedMin: 0.7, speedMax: 1.4, template: Assets.Fish_3     },
  { id:  6, name: 'Rainbow Fish',     zone: 1, rarity: 'legendary', sizeMin: 0.8, sizeMax: 1.2, speedMin: 2.0, speedMax: 3.2, template: Assets.RainbowFish },

  // ── Zone 2 — Mid-depth ────────────────────────────────────────────────────────
  { id:  7, name: 'Silver Carp',      zone: 2, rarity: 'common',    sizeMin: 1.4, sizeMax: 2.1, speedMin: 0.9, speedMax: 1.7, template: Assets.Fish_1v2   },
  { id:  8, name: 'Green Discus',     zone: 2, rarity: 'common',    sizeMin: 1.2, sizeMax: 1.8, speedMin: 0.6, speedMax: 1.2, template: Assets.Fish_2v2   },
  { id:  9, name: 'Dolphin',          zone: 2, rarity: 'common',    sizeMin: 1.8, sizeMax: 2.6, speedMin: 1.6, speedMax: 2.8, template: Assets.Dolphin    },
  { id: 10, name: 'Flame Angelfish',  zone: 2, rarity: 'rare',      sizeMin: 1.2, sizeMax: 1.8, speedMin: 1.0, speedMax: 1.8, template: Assets.Fish_3v2   },
  { id: 11, name: 'Sand Flounder',    zone: 2, rarity: 'rare',      sizeMin: 1.4, sizeMax: 2.1, speedMin: 0.5, speedMax: 1.0, template: Assets.Fish_5v2   },
  { id: 12, name: 'Sea Turtle',       zone: 2, rarity: 'legendary', sizeMin: 2.2, sizeMax: 3.2, speedMin: 0.4, speedMax: 0.9, template: Assets.Tortoise   },

  // ── Zone 3 — Abyss ───────────────────────────────────────────────────────────
  { id: 13, name: 'Violet Barracuda', zone: 3, rarity: 'common',    sizeMin: 1.6, sizeMax: 2.4, speedMin: 1.8, speedMax: 3.0, template: Assets.Fish_4v2   },
  { id: 14, name: 'Blue Flounder',    zone: 3, rarity: 'common',    sizeMin: 1.4, sizeMax: 2.1, speedMin: 0.5, speedMax: 1.0, template: Assets.Fish_5     },
  { id: 15, name: 'Reef Shark',       zone: 3, rarity: 'common',    sizeMin: 2.4, sizeMax: 3.4, speedMin: 1.4, speedMax: 2.4, template: Assets.Sharkv2    },
  { id: 16, name: 'Pink Dolphin',     zone: 3, rarity: 'rare',      sizeMin: 1.8, sizeMax: 2.6, speedMin: 1.6, speedMax: 2.8, template: Assets.Dolphinv2  },
  { id: 17, name: 'Barracuda',        zone: 3, rarity: 'rare',      sizeMin: 1.6, sizeMax: 2.4, speedMin: 1.8, speedMax: 3.0, template: Assets.Fish_4     },
  { id: 18, name: 'Pink Shark',       zone: 3, rarity: 'legendary', sizeMin: 2.8, sizeMax: 4.0, speedMin: 2.0, speedMax: 3.4, template: Assets.Shark      },

];
