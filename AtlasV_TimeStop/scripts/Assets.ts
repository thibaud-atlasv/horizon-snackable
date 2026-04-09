import { TemplateAsset } from 'meta/worlds';
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
  export const FallingObjTemplates: Record<FallingObjType, TemplateAsset> = {
    [FallingObjType.Log]:  new TemplateAsset('../Templates/GameplayObjects/Log.hstf'),
    [FallingObjType.Ball]: new TemplateAsset('../Templates/GameplayObjects/Ball.hstf'),
  };

  export const FloatingText : TemplateAsset = new TemplateAsset('../Templates/GameplayObjects/FloatingText.hstf');
  export const HorizontalLine : TemplateAsset = new TemplateAsset('../Templates/GameplayObjects/HorizontalLine.hstf');

  export const Primitives = {
      Cube : new TemplateAsset('../Templates/Primitives/Cube.hstf'),
  }
}