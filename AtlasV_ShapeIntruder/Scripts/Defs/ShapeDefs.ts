// Single source of truth for shapes.
// To add a shape: add its sprite(s) to Assets.ts — ShapeKey updates automatically.

import { SHAPE_TEXTURE_MAP } from "../Assets";

export interface IShapeDef {
  sprite: string;
}

export type ShapeKey = keyof typeof SHAPE_TEXTURE_MAP;

export const SHAPE_KEYS = Object.keys(SHAPE_TEXTURE_MAP) as ShapeKey[];
