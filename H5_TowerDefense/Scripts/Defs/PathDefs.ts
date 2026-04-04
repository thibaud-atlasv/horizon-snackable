// Waypoints for level 0 — asymmetric snake path (top → bottom)
// [col, row] — col = Z axis (horizontal), row = X axis (vertical, 0 = top)
// Grid is 18×24 (CELL_SIZE = 0.5, same world footprint as 9×12 at 1.0)
// Entry: col 4, row 0 (top). Exit: col 12, row 22 (bottom).
//
//   col:  0  2  4  6  8  10 12 14 16
// row 0:         ▼
// row 6:         └────────────────┐    (right to col 14)
// row 12:  ┌───────────────────────┘   (left to col 2)
// row 18:  └────────────────────┐      (right to col 12)
// row 22:                       ▼

export const PATH_WAYPOINTS_LEVEL_0: ReadonlyArray<readonly [number, number]> = [
  [ 4,  0],
  [ 4,  6],
  [14,  6],
  [14, 12],
  [ 2, 12],
  [ 2, 18],
  [12, 18],
  [12, 23],
] as const;
