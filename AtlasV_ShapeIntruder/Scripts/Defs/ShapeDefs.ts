// Single source of truth for shapes and colors.
// To add a color or shape: append one entry here — ColorKey / ShapeKey update automatically.

import { SHAPE_TEXTURE_MAP } from "../Assets";

export interface IColorDef {
  hex: string;
}

export interface IShapeDef {
  sprite: string;
}

export const COLOR_DEFS = {
  red:    { hex: '#e8333a' },  // rouge vif — ref image heart
  orange: { hex: '#f4834a' },  // orange saumon — ref image triangle
  lime:   { hex: '#8dc63f' },  // jaune-vert — ref image circle
  green:  { hex: '#3aaa55' },  // vert profond — ref image circle bas
  pink:   { hex: '#e85fa0' },  // rose vif — ref image circle haut
  blue:   { hex: '#4a7fd4' },  // bleu roi — ref image diamond
  purple: { hex: '#7b52c1' },  // violet — ref image pentagon
  cyan:   { hex: '#29b8c8' },  // cyan — complément distinct
  teal:   { hex: '#2a9d8f' },  // teal profond — complément distinct
  yellow: { hex: '#f5c518' },  // jaune soleil — complément distinct
} as const satisfies Record<string, IColorDef>;

export type ColorKey = keyof typeof COLOR_DEFS;
export type ShapeKey = keyof typeof SHAPE_TEXTURE_MAP;

export const COLOR_KEYS = Object.keys(COLOR_DEFS) as ColorKey[];
export const SHAPE_KEYS = Object.keys(SHAPE_TEXTURE_MAP) as ShapeKey[];

