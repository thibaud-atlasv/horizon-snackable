import type { IWaveDef } from '../Types';
import { PATH_WAYPOINTS_LEVEL_0 } from './PathDefs';

export interface ILevelDef {
  startGold: number;
  startLives: number;
  pathWaypoints: ReadonlyArray<readonly [number, number]>;
  waves: IWaveDef[];
}

// Wave compositions designed around economy/placement tension:
// early waves reward fast kills (gold rush), mid waves demand AoE control,
// late waves require layered defenses.
const WAVES_LEVEL_0: IWaveDef[] = [
  // 1 — tutorial: pure basics
  { groups: [{ enemyId: 'basic', count: 8 }] },
  // 2 — first fast enemies
  { groups: [{ enemyId: 'basic', count: 10 }, { enemyId: 'fast', count: 4 }] },
  // 3 — tanks introduced, rewards Cannon investment
  { groups: [{ enemyId: 'fast', count: 5 }, { enemyId: 'tank', count: 3 }] },
  // 4 — speed pressure, forces Frost or Laser decision
  { groups: [{ enemyId: 'basic', count: 12 }, { enemyId: 'fast', count: 8 }] },
  // 5 — Tank + Fast combo: Frost essential to let Cannon catch up
  { groups: [{ enemyId: 'tank', count: 5 }, { enemyId: 'fast', count: 8 }] },
  // 6 — first Boss, flanked by Basics to split tower attention
  { groups: [{ enemyId: 'boss', count: 1 }, { enemyId: 'basic', count: 15 }] },
  // 7 — mixed attrition: no single tower handles all
  { groups: [{ enemyId: 'fast', count: 12 }, { enemyId: 'tank', count: 4 }, { enemyId: 'boss', count: 1 }] },
  // 8 — many Basics + Boss: AoE shines, Boss soaks single shots
  { groups: [{ enemyId: 'basic', count: 20 }, { enemyId: 'boss', count: 2 }] },
  // 9 — speed + armor wall: requires full tower synergy
  { groups: [{ enemyId: 'fast', count: 15 }, { enemyId: 'tank', count: 8 }] },
  // 10 — final: everything at once
  { groups: [{ enemyId: 'boss', count: 4 }, { enemyId: 'tank', count: 10 }, { enemyId: 'fast', count: 15 }, { enemyId: 'basic', count: 10 }] },
];

export const LEVEL_DEFS: ILevelDef[] = [
  {
    startGold: 150,
    startLives: 20,
    pathWaypoints: PATH_WAYPOINTS_LEVEL_0,
    waves: WAVES_LEVEL_0,
  },
];
