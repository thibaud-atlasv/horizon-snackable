import {
  CONVEYOR_BASE_SPEED,
  WAREHOUSE_BASE_CAPACITY,
  TRUCK_BASE_COUNT,
  PRODUCTION_BASE_INTERVAL,
} from '../Constants';
import type { IUpgradeDef } from '../Types';

// ---------------------------------------------------------------------------
// IUpgradeDef — one entry per upgradeable module.
//
// getCost(level)   → cost to go from `level` to `level + 1`
// getEffect(level) → the module's operative value AT `level`
//                    (level 0 = unupgraded base)
// ---------------------------------------------------------------------------

// --- Conveyor: speed (slot advances / second) ---
const CONVEYOR_SPEEDS = [CONVEYOR_BASE_SPEED, 1.5, 2.0, 2.5, 3.0, 3.5];
const CONVEYOR_COSTS  = [50, 100, 200, 400, 800];

// --- Warehouse: max stock capacity ---
const WAREHOUSE_CAPS  = [WAREHOUSE_BASE_CAPACITY, 12, 18, 24];
const WAREHOUSE_COSTS = [50, 100, 200, 300];

// --- Trucks: total truck count ---
const TRUCK_COUNTS = [TRUCK_BASE_COUNT, 2, 3, 4, 5, 6];
const TRUCK_COSTS  = [100, 200, 300, 500, 1000];

// --- Production: production interval (seconds per product) ---
// Level 0 = locked (Infinity). First upgrade unlocks at base interval.
const PROD_INTERVALS = [Infinity, PRODUCTION_BASE_INTERVAL, 3.0, 2.2, 1.6, 1.2, 1.0];
const PROD0_COSTS    = [0, 100, 200, 400, 600, 800];     // first module: free unlock
const PROD_COSTS     = [100, 200, 400, 600, 800, 1600];    // other modules: paid unlock

export const UPGRADE_CONVEYOR: IUpgradeDef = {
    id:          'conveyor',
    label:       'Conveyor Belt',
    effectLabel: 'Speed (slots/s)',
    maxLevel:    CONVEYOR_SPEEDS.length - 1,
    getCost:     (level) => CONVEYOR_COSTS[level] ?? Infinity,
    getEffect:   (level) => CONVEYOR_SPEEDS[level] ?? CONVEYOR_SPEEDS[CONVEYOR_SPEEDS.length - 1],
  };
export const UPGRADE_PRODUCTION0: IUpgradeDef = {
    id:          'production0',
    label:       'Production 1',
    effectLabel: 'Interval (s)',
    maxLevel:    PROD_INTERVALS.length - 1,
    getCost:     (level) => PROD0_COSTS[level] ?? Infinity,
    getEffect:   (level) => PROD_INTERVALS[level] ?? PROD_INTERVALS[PROD_INTERVALS.length - 1],
  };

export const UPGRADE_WAREHOUSE: IUpgradeDef = {
  id:          'warehouse',
  label:       'Warehouse',
  effectLabel: 'Capacity',
  maxLevel:    WAREHOUSE_CAPS.length - 1,
  getCost:     (level) => WAREHOUSE_COSTS[level] ?? Infinity,
  getEffect:   (level) => WAREHOUSE_CAPS[level] ?? WAREHOUSE_CAPS[WAREHOUSE_CAPS.length - 1],
};

export const UPGRADE_TRUCKS: IUpgradeDef = {
  id:          'trucks',
  label:       'Trucks',
  effectLabel: 'Truck Count',
  maxLevel:    TRUCK_COUNTS.length - 1,
  getCost:     (level) => TRUCK_COSTS[level] ?? Infinity,
  getEffect:   (level) => TRUCK_COUNTS[level] ?? TRUCK_COUNTS[TRUCK_COUNTS.length - 1],
};

export const UPGRADE_PRODUCTION1: IUpgradeDef = {
  id:          'production1',
  label:       'Production 2',
  effectLabel: 'Interval (s)',
  maxLevel:    PROD_INTERVALS.length - 1,
  getCost:     (level) => PROD_COSTS[level] ?? Infinity,
  getEffect:   (level) => PROD_INTERVALS[level] ?? PROD_INTERVALS[PROD_INTERVALS.length - 1],
};

export const UPGRADE_PRODUCTION2: IUpgradeDef = {
  id:          'production2',
  label:       'Production 3',
  effectLabel: 'Interval (s)',
  maxLevel:    PROD_INTERVALS.length - 1,
  getCost:     (level) => PROD_COSTS[level] ?? Infinity,
  getEffect:   (level) => PROD_INTERVALS[level] ?? PROD_INTERVALS[PROD_INTERVALS.length - 1],
};

export const UPGRADE_DEFS: IUpgradeDef[] = [
  UPGRADE_CONVEYOR,
  UPGRADE_WAREHOUSE,
  UPGRADE_TRUCKS,
  UPGRADE_PRODUCTION0,
  UPGRADE_PRODUCTION1,
  UPGRADE_PRODUCTION2,
];