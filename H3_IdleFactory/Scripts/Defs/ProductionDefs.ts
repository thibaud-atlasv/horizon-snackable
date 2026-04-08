// ---------------------------------------------------------------------------
// Defines where each production module deposits on the conveyor belt.
//
// depositDistance: distance from the warehouse end (0) on the belt where
//   the module places its product. Values should be spaced at least
//   CONVEYOR_MIN_GAP apart and within [0, CONVEYOR_BELT_LENGTH].
//   3.75 / 7.5 / 11.25 divide the 15-unit belt into evenly spaced entry
//   points matching the greybox scene layout.
//
// To create a variant with different modules: replace this array.
// The number of entries also controls how many modules ProductionService creates.
// ---------------------------------------------------------------------------
export interface IProductionModuleDef {
  depositDistance: number;
}

export const PRODUCTION_MODULE_DEFS: IProductionModuleDef[] = [
  { depositDistance: 3.75 },
  { depositDistance: 7.5 },
  { depositDistance: 11.25 },
];
