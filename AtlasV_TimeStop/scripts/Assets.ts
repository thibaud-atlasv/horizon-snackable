import { TemplateAsset, TextureAsset } from 'meta/worlds';
import { FallingObjType } from './Types';

/**
 * Single source of truth for ALL TemplateAsset references.
 *
 * Workflow:
 *   1. Create a new .hstf template in Horizon Studio.
 *   2. Add an entry here using: new TemplateAsset('../Templates/[Folder]/[Name].hstf')
 *   3. Reference it via FallingObjTemplates[FallingObjType.YourType].
 *
 * FallingObjTemplates maps each FallingObjType to its entity template.
 * SpawnManager uses this record — no hardcoded template paths in gameplay scripts.
 */


export namespace Assets {
  export const BambooCenter = new TextureAsset("@Textures/bambooCenter.png");
  export const BambooLeft   = new TextureAsset("@Textures/bambooLeft.png");
  export const BambooRight  = new TextureAsset("@Textures/bambooRight.png");

  export const SlicedFX    = new TextureAsset("@Textures/BambooSlicedFX.png");
  export const SlicedLeft  = new TextureAsset("@Textures/BambooSlicedLeft.png");
  export const SlicedRight = new TextureAsset("@Textures/BambooSlicedRight.png");

  export const Debug = new TextureAsset("@Textures/debug.png");
}