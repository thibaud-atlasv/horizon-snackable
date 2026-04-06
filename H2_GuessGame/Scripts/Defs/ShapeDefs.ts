// Single source of truth for shapes and colors.
// To add a color or shape: append one entry here — ColorKey / ShapeKey update automatically.

export interface IColorDef {
  hex: string;
}

export interface IShapeDef {
  // SVG path, unit-radius centered at origin.
  path: string;
}

export const COLOR_DEFS = {
  white:  { hex: '#fef3c7' },
  red:    { hex: '#ef4444' },
  orange: { hex: '#fb923c' },
  yellow: { hex: '#eab308' },
  lime:   { hex: '#84cc16' },
  teal:   { hex: '#14b8a6' },
  blue:   { hex: '#3b82f6' },
  purple: { hex: '#8b5cf6' },
  pink:   { hex: '#ec4899' },
} as const satisfies Record<string, IColorDef>;

export const SHAPE_DEFS = {
  circle:    { path: 'M 0 -1 C 0.5523 -1, 1 -0.5523, 1 0 C 1 0.5523, 0.5523 1, 0 1 C -0.5523 1, -1 0.5523, -1 0 C -1 -0.5523, -0.5523 -1, 0 -1 Z' },
  semicircle:{ path: 'M -1 0 C -1 -0.5523, -0.5523 -1, 0 -1 C 0.5523 -1, 1 -0.5523, 1 0 Z' },
  triangle:  { path: 'M 0 -1 L 0.866 0.5 L -0.866 0.5 Z' },
  square:    { path: 'M -0.707 -0.707 L 0.707 -0.707 L 0.707 0.707 L -0.707 0.707 Z' },
  pentagon:  { path: 'M 0 -1 L 0.9511 -0.309 L 0.5878 0.809 L -0.5878 0.809 L -0.9511 -0.309 Z' },
  hexagon:   { path: 'M 1 0 L 0.5 0.866 L -0.5 0.866 L -1 0 L -0.5 -0.866 L 0.5 -0.866 Z' },
  star4:     { path: 'M 0 -1 L 0.2 -0.2 L 1 0 L 0.2 0.2 L 0 1 L -0.2 0.2 L -1 0 L -0.2 -0.2 Z' },
  star:      { path: 'M 0 -1 L 0.2245 -0.309 L 0.9511 -0.309 L 0.3633 0.118 L 0.5878 0.809 L 0 0.382 L -0.5878 0.809 L -0.3633 0.118 L -0.9511 -0.309 L -0.2245 -0.309 Z' },
  teardrop:  { path: 'M 0 -1 C 0.4 -0.5, 0.9 0.1, 0.7 0.6 C 0.5 1, -0.5 1, -0.7 0.6 C -0.9 0.1, -0.4 -0.5, 0 -1 Z' },
  cross:     { path: 'M -0.3 -1 L 0.3 -1 L 0.3 -0.3 L 1 -0.3 L 1 0.3 L 0.3 0.3 L 0.3 1 L -0.3 1 L -0.3 0.3 L -1 0.3 L -1 -0.3 L -0.3 -0.3 Z' },
  arrow:     { path: 'M 0 -1 L 0.7 0.1 L 0.3 0.1 L 0.3 1 L -0.3 1 L -0.3 0.1 L -0.7 0.1 Z' },
} as const satisfies Record<string, IShapeDef>;

export type ColorKey = keyof typeof COLOR_DEFS;
export type ShapeKey = keyof typeof SHAPE_DEFS;

export const COLOR_KEYS = Object.keys(COLOR_DEFS) as ColorKey[];
export const SHAPE_KEYS = Object.keys(SHAPE_DEFS) as ShapeKey[];
