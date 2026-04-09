// LevelConfig.ts — Round-by-round gameplay configuration.
//
// Each RoundConfig defines a list of WaveObjDef entries.
// A WaveObjDef specifies how many objects of a given type fall, and
// which physics features are active for them.
// SpawnManager reads these at the start of each round.
//
// To add a new object type to a wave:
//   1. Add a FallingObjType variant in Types.ts
//   2. Add its TemplateAsset in Assets.ts
//   3. Add a WaveObjDef entry here

import { FallingObjType, type RoundConfig } from './Types';

/** Helper: total object count across all WaveObjDef entries. */
export function totalObjCount(round: RoundConfig): number {
  return round.objects.reduce((sum, d) => sum + d.count, 0);
}

export const ROUND_DEFS: RoundConfig[] = [
  // R1 — tutorial : un seul log droit, pas de surprise
  { objects: [
    { type: FallingObjType.Log,  count: 1, bounce: false, pivot: false },
  ]},
  // R2 — deux logs simples
  { objects: [
    { type: FallingObjType.Log,  count: 2, bounce: false, pivot: false },
  ]},
  // R3 — première ball : comportement inattendu, garde le joueur alerte
  { objects: [
    { type: FallingObjType.Log,  count: 1, bounce: true,  pivot: false },
    { type: FallingObjType.Ball, count: 2, bounce: false, pivot: false },
  ]},
  // R4 — mix 2 logs bounce + 1 ball
  { objects: [
    { type: FallingObjType.Log,  count: 2, bounce: true,  pivot: false },
    { type: FallingObjType.Ball, count: 2, bounce: false, pivot: false },
  ]},
  // R5 — pivot introduit sur les logs, la ball reste lisible
  { objects: [
    { type: FallingObjType.Log,  count: 3, bounce: true,  pivot: true  },
    { type: FallingObjType.Ball, count: 1, bounce: false, pivot: false },
  ]},
  // R6 — majorité logs, 2 balls pour briser le rythme
  { objects: [
    { type: FallingObjType.Log,  count: 2, bounce: true,  pivot: true  },
    { type: FallingObjType.Ball, count: 3, bounce: false, pivot: false },
  ]},
  // R7 — pression max sur les logs, une seule ball comme répit
  { objects: [
    { type: FallingObjType.Log,  count: 3, bounce: true,  pivot: true  },
    { type: FallingObjType.Ball, count: 1, bounce: false, pivot: false },
  ]},
  // R8 — 5 objets, ratio 3/2
  { objects: [
    { type: FallingObjType.Log,  count: 3, bounce: true,  pivot: true  },
    { type: FallingObjType.Ball, count: 2, bounce: false, pivot: false },
  ]},
  // R9 — 5 objets, ratio 4/1 : logs dominants, une ball surprise
  { objects: [
    { type: FallingObjType.Log,  count: 4, bounce: true,  pivot: true  },
    { type: FallingObjType.Ball, count: 1, bounce: false, pivot: false },
  ]},
  // R10 — final : 5 logs full chaos + 1 ball
  { objects: [
    { type: FallingObjType.Log,  count: 5, bounce: true,  pivot: true  },
    { type: FallingObjType.Ball, count: 1, bounce: false, pivot: false },
  ]},
];
