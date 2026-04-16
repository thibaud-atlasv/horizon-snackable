// No template assets required for the initial game loop.
// Add TemplateAsset declarations here when templates are needed.

import { TextureAsset } from "meta/worlds";

// Pre-constructed TextureAsset map for each shape (static string literals required by linter)
export const SHAPE_TEXTURE_MAP: Record<string, TextureAsset> = {
  circle:        new TextureAsset('@shape/circle.png'),
  triangle:      new TextureAsset('@shape/triangle.png'),
  triangleEmpty: new TextureAsset('@shape/triangleempty.png'),
  square:        new TextureAsset('@shape/square.png'),
  squareTilted:  new TextureAsset('@shape/squaretilted.png'),
  pentagon:      new TextureAsset('@shape/pentagon.png'),
  hexagon:       new TextureAsset('@shape/hexagon.png'),
  starEmpty:     new TextureAsset('@shape/starempty.png'),
  starFill:      new TextureAsset('@shape/starfill.png'),
  heart:         new TextureAsset('@shape/heart.png'),
  heartEmpty:    new TextureAsset('@shape/heartempty.png'),
};