/**
 * FishDefs — static catalog of all catchable species.
 *
 * FISH_DEFS   — core data (id, family, rarity, depth range, template to spawn).
 *               Read by FishSpawnService to choose what to spawn.
 * randomDef() — rarity-weighted random selection, pure function, no service.
 *
 * To add a species: copy an entry and change the values.
 * To add a new family: create Fish/Defs/MyFamilyDefs.ts and import in FishSpawnService.
 */
import { Assets } from '../Assets';
import type { IFishDef } from '../Types';

// ── Core defs ─────────────────────────────────────────────────────────────────
export const FISH_DEFS: IFishDef[] = [
  // Solars
  { id: 1, name: 'Sparkfin',  family: 'Solars', waterLayerMin: 0, waterLayerMax: 7, rarity: 'common',    template: Assets.FishTemplate },
  { id: 2, name: 'Blazeback', family: 'Solars', waterLayerMin: 0, waterLayerMax: 7, rarity: 'common',    template: Assets.FishTemplate },
  { id: 3, name: 'Sunwyrm',   family: 'Solars', waterLayerMin: 0, waterLayerMax: 7, rarity: 'legendary', template: Assets.FishTemplate },
];

// ── Weighted random selection ──────────────────────────────────────────────────
export function randomDef(opts?: { layer?: number; families?: string[] }): IFishDef {
  let pool = FISH_DEFS;
  if (opts?.layer !== undefined) {
    const l = opts.layer;
    pool = pool.filter(d => d.waterLayerMin <= l && d.waterLayerMax >= l);
  }
  if (opts?.families && opts.families.length > 0) {
    pool = pool.filter(d => (opts.families as string[]).includes(d.family));
  }
  if (pool.length === 0) pool = FISH_DEFS;

  const weights = pool.map(d => d.rarity === 'legendary' ? 1 : d.rarity === 'rare' ? 3 : 10);
  const total   = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
