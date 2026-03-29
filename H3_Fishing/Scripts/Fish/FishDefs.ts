/**
 * FishDefs — static catalog of all catchable species.
 *
 * FISH_DEFS — core data (id, zone, rarity, size/speed range, template to spawn).
 *             Read by FishSpawnService to choose what to spawn per zone.
 *
 * To add a species: copy an entry and change the values.
 * Zone 1: Y 4.5 to -8.0 (surface water)
 * Zone 2: Y -8.0 to -24.0 (mid-depth)
 * Zone 3: Y -24.0 to -40.0 (abyss)
 */
import { Assets } from '../Assets';
import type { IFishDef } from '../Types';

export const FISH_DEFS: IFishDef[] = [
  // ── Zone 1 ────────────────────────────────────────────────────────────────
  { id:  1, name: 'ClownFish',   zone: 1, rarity: 'common',    sizeMin: 0.6, sizeMax: 1.0, speedMin: 1.0, speedMax: 2.0, template: Assets.ClownFish },
  { id:  2, name: 'AngelFish',   zone: 1, rarity: 'common',    sizeMin: 0.7, sizeMax: 1.1, speedMin: 0.8, speedMax: 1.6, template: Assets.AngelFish },
  { id:  3, name: 'TigerFish',   zone: 1, rarity: 'common',    sizeMin: 0.8, sizeMax: 1.3, speedMin: 1.2, speedMax: 2.2, template: Assets.TigerFish },
  { id:  4, name: 'BlueTang',    zone: 1, rarity: 'rare',      sizeMin: 0.9, sizeMax: 1.4, speedMin: 1.4, speedMax: 2.4, template: Assets.BlueTang },
  { id:  5, name: 'Seahorse',    zone: 1, rarity: 'rare',      sizeMin: 0.5, sizeMax: 0.9, speedMin: 0.4, speedMax: 0.8, template: Assets.Seahorse },
  { id:  6, name: 'GoldenManta', zone: 1, rarity: 'legendary', sizeMin: 1.6, sizeMax: 2.4, speedMin: 0.8, speedMax: 1.4, template: Assets.GoldenManta },

  // ── Zone 2 ────────────────────────────────────────────────────────────────
  { id:  7, name: 'PufferFish',       zone: 2, rarity: 'common',    sizeMin: 0.8, sizeMax: 1.2, speedMin: 0.6, speedMax: 1.2, template: Assets.PufferFish },
  { id:  8, name: 'LanternFish',      zone: 2, rarity: 'common',    sizeMin: 0.5, sizeMax: 0.9, speedMin: 0.8, speedMax: 1.6, template: Assets.LanternFish },
  { id:  9, name: 'GhostEel',         zone: 2, rarity: 'common',    sizeMin: 0.9, sizeMax: 1.5, speedMin: 0.7, speedMax: 1.4, template: Assets.GhostEel },
  { id: 10, name: 'CrystalJellyfish', zone: 2, rarity: 'rare',      sizeMin: 1.0, sizeMax: 1.6, speedMin: 0.3, speedMax: 0.7, template: Assets.CrystalJellyfish },
  { id: 11, name: 'AnglerFish',       zone: 2, rarity: 'rare',      sizeMin: 1.1, sizeMax: 1.7, speedMin: 0.5, speedMax: 1.0, template: Assets.AnglerFish },
  { id: 12, name: 'DeepDragon',       zone: 2, rarity: 'legendary', sizeMin: 1.8, sizeMax: 2.6, speedMin: 0.6, speedMax: 1.2, template: Assets.DeepDragon },

  // ── Zone 3 ────────────────────────────────────────────────────────────────
  { id: 13, name: 'ShadowFish',       zone: 3, rarity: 'common',    sizeMin: 0.7, sizeMax: 1.1, speedMin: 0.9, speedMax: 1.8, template: Assets.ShadowFish },
  { id: 14, name: 'AbyssEel',         zone: 3, rarity: 'common',    sizeMin: 1.0, sizeMax: 1.6, speedMin: 0.6, speedMax: 1.2, template: Assets.AbyssEel },
  { id: 15, name: 'VoidRay',          zone: 3, rarity: 'common',    sizeMin: 0.8, sizeMax: 1.3, speedMin: 1.0, speedMax: 2.0, template: Assets.VoidRay },
  { id: 16, name: 'NightManta',       zone: 3, rarity: 'rare',      sizeMin: 1.4, sizeMax: 2.0, speedMin: 0.5, speedMax: 1.0, template: Assets.NightManta },
  { id: 17, name: 'AbyssalKing',      zone: 3, rarity: 'rare',      sizeMin: 1.3, sizeMax: 1.9, speedMin: 0.4, speedMax: 0.9, template: Assets.AbyssalKing },
  { id: 18, name: 'AncientLeviathan', zone: 3, rarity: 'legendary', sizeMin: 2.0, sizeMax: 3.2, speedMin: 0.3, speedMax: 0.7, template: Assets.AncientLeviathan },
];
