/**
 * LevelDefs.ts — Static data table for level and wave definitions.
 *
 * Pure data — no side effects, no service calls.
 * ILevelDef: startGold, startLives, pathWaypoints (ref to PathDefs), waves[].
 * IWaveDef: groups[] of { enemyId, count } — spawned sequentially by WaveService.
 * To add a wave: add an entry to LEVEL_DEFS[0].waves.
 * To add a level: add a new ILevelDef entry to LEVEL_DEFS.
 * Read by WaveService and PathService via LEVEL_DEFS[0].
 */
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
  // 1 — test: 2 of each type
  { groups: [{ enemyId: 'basic', count: 8 } ]},
  // 2 — first fast enemies
  { groups: [{ enemyId: 'basic', count: 9 }, { enemyId: 'fast', count: 3 }] },
  // 3 — tanks introduced, rewards Cannon investment
  { groups: [{ enemyId: 'basic', count: 5 }, { enemyId: 'tank', count: 3 },{ enemyId: 'basic', count: 5 }, ] },
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

  // ── Act 2 ──────────────────────────────────────────────────────────────────
  // 11 — breather opener: basics only, but a lot of them
  { groups: [{ enemyId: 'basic', count: 25 }] },
  // 12 — boss escort: fast units screen the boss from single-target fire
  { groups: [{ enemyId: 'boss', count: 3 }, { enemyId: 'fast', count: 18 }] },
  // 13 — tank wall + basic cleanup crew
  { groups: [{ enemyId: 'tank', count: 14 }, { enemyId: 'basic', count: 18 }] },
  // 14 — pure speed pressure: frost becomes mandatory
  { groups: [{ enemyId: 'fast', count: 30 }] },
  // 15 — mid-act boss rush flanked by tanks
  { groups: [{ enemyId: 'boss', count: 6 }, { enemyId: 'tank', count: 8 }] },
  // 16 — attrition: fast + tank interleaved, no obvious counter
  { groups: [{ enemyId: 'fast', count: 20 }, { enemyId: 'tank', count: 12 }, { enemyId: 'fast', count: 10 }] },
  // 17 — basic flood: AoE towers must carry, single-target overwhelmed
  { groups: [{ enemyId: 'basic', count: 40 }] },
  // 18 — elite vanguard: bosses lead, tanks follow, fast clean up stragglers
  { groups: [{ enemyId: 'boss', count: 5 }, { enemyId: 'tank', count: 15 }, { enemyId: 'fast', count: 12 }] },
  // 19 — endurance: slow tank tide that outlasts short-range towers
  { groups: [{ enemyId: 'tank', count: 25 }, { enemyId: 'basic', count: 20 }] },
  // 20 — true final: maximum pressure across all enemy types
  { groups: [{ enemyId: 'boss', count: 8 }, { enemyId: 'tank', count: 20 }, { enemyId: 'fast', count: 25 }, { enemyId: 'basic', count: 20 }] },
];

export const LEVEL_DEFS: ILevelDef[] = [
  {
    startGold: 150,
    startLives: 20,
    pathWaypoints: PATH_WAYPOINTS_LEVEL_0,
    waves: WAVES_LEVEL_0,
  },
];
