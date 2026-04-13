// Waypoints for level 0 — complex zigzag path with many strategic nodes
// [col, row] — col = Z axis (horizontal), row = X axis (vertical, 0 = top)
// Grid is 18×18 (CELL_SIZE = 0.5 → 9×9 world units)
// Entry: col 3, row 0 (top). Exit: col 5, row 17 (bottom).
//
// Path flows top → bottom with lots of horizontal zigzags:
//   row 0:     ▼
//   row 4:  ┌──┘     ┐
//   row 2:  └────────┘
//   row 6:     ┌─────┘
//   row 10:    └─────────┐
//   row 14: ┌────────────┘
//   row 17: ▼

export const PATH_WAYPOINTS_LEVEL_0: ReadonlyArray<readonly [number, number]> = [
  [ 2,  0],
  [ 2,  6],
  [ 5,  6],
  [ 5,  4],
  [10,  4],
  [10,  8],
  [ 6,  8],
  [ 6, 12],
  [12, 12],
  [12, 16],
  [ 4, 16],
  [ 4, 21],
] as const;
