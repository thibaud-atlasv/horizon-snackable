// Waypoints for level 0 — asymmetric snake path (top → bottom)
// [col, row] — col = Z axis (horizontal), row = X axis (vertical, 0 = top)
// Grid is 16×26 (CELL_SIZE = 0.5 → 8×13 world units)
// Entry: col 3, row 0 (top). Exit: col 12, row 25 (bottom).
//
//   col:  0  2  4  6  8  10 12 14
// row 0:      ▼
// row 7:      └──────────────┐       (right to col 12)
// row 14: ┌──────────────────┘       (left to col 2)
// row 20: └──────────────────┐       (right to col 12)
// row 25:                    ▼

export const PATH_WAYPOINTS_LEVEL_0: ReadonlyArray<readonly [number, number]> = [
  [ 3,  0],
  [ 3,  7],
  [12,  7],
  [12, 14],
  [ 2, 14],
  [ 2, 20],
  [12, 20],
  [12, 25],
] as const;
