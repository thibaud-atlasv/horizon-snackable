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
  // R1
  { objects: [{ type: FallingObjType.Log, count: 1, bounce: false, pivot: false }]},
  // R2
  { objects: [{ type: FallingObjType.Log, count: 2, bounce: false, pivot: false }]},
  // R3
  { objects: [{ type: FallingObjType.Log, count: 3, bounce: true,  pivot: false }]},
  // R4
  { objects: [{ type: FallingObjType.Log, count: 4, bounce: true,  pivot: false }]},
  // R5 — first ball appears
  { objects: [
    { type: FallingObjType.Log,  count: 2, bounce: true, pivot: true  },
    { type: FallingObjType.Ball, count: 1, bounce: true, pivot: false },
  ]},
  // R6
  { objects: [
    { type: FallingObjType.Log,  count: 3, bounce: true, pivot: true  },
    { type: FallingObjType.Ball, count: 1, bounce: true, pivot: false },
  ]},
  // R7
  { objects: [
    { type: FallingObjType.Log,  count: 3, bounce: true, pivot: true  },
    { type: FallingObjType.Ball, count: 2, bounce: true, pivot: false },
  ]},
  // R8
  { objects: [
    { type: FallingObjType.Log,  count: 3, bounce: true, pivot: true  },
    { type: FallingObjType.Ball, count: 2, bounce: true, pivot: false },
  ]},
  // R9
  { objects: [
    { type: FallingObjType.Log,  count: 4, bounce: true, pivot: true  },
    { type: FallingObjType.Ball, count: 2, bounce: true, pivot: false },
  ]},
  // R10
  { objects: [
    { type: FallingObjType.Log,  count: 4, bounce: true, pivot: true  },
    { type: FallingObjType.Ball, count: 3, bounce: true, pivot: false },
  ]},
];
