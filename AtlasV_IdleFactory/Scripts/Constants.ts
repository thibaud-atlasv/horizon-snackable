// ---------------------------------------------------------------------------
// Conveyor Belt
// 8 slots matching the greybox scene markers (indices 0 = warehouse side,
// 7 = bottom / farthest from warehouse).
// ---------------------------------------------------------------------------
export const MAX_STORAGE  = 3 * 8;
export const CONVEYOR_SLOT_COUNT  = 8;       // kept for pool sizing / belt marker count
export const CONVEYOR_BASE_SPEED  = 1.0;     // world units per second
export const CONVEYOR_BELT_LENGTH = 15;      // world units from warehouse (0) to production end
export const CONVEYOR_MIN_GAP     = 1.5;     // minimum distance between two products on belt

// ---------------------------------------------------------------------------
// Warehouse
// ---------------------------------------------------------------------------
export const WAREHOUSE_BASE_CAPACITY = 6;

// ---------------------------------------------------------------------------
// Trucks
// ---------------------------------------------------------------------------
export const TRUCK_CAPACITY        = 3;    // products per trip
export const TRUCK_BASE_COUNT      = 1;
export const TRUCK_SPEED           = 1.5;  // world units per second (constant across all phases)
export const TRUCK_LOADING_DURATION = 0.3; // seconds for cargo-loading pause at dock

// World-space positions — must match TruckController @property defaults
export const TRUCK_LOADING_X        =  0.0;  // X of loading dock
export const TRUCK_WAITING_SPACING  =  1.5;  // gap between queued trucks along X
export const TRUCK_OFFSCREEN_RIGHT_X =  3.5; // X where truck exits right
export const TRUCK_OFFSCREEN_LEFT_X  = -3.5; // X where truck re-enters from left

// ---------------------------------------------------------------------------
// Production modules
// ---------------------------------------------------------------------------
export const PRODUCTION_MODULE_COUNT  = 3;
export const PRODUCTION_BASE_INTERVAL = 4.0; // seconds per product at level 0

// ---------------------------------------------------------------------------
// Economy
// ---------------------------------------------------------------------------
export const MONEY_PER_PRODUCT = 15;
export const STARTING_MONEY    = 1000;
