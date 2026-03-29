/**
 * Single source of truth for ALL TemplateAsset references.
 *
 * Workflow:
 *   1. Create a new .hstf template in Horizon Studio.
 *   2. Add an entry here.
 */
import { TemplateAsset } from 'meta/worlds';

export namespace Assets {
  // ── Fish ──────────────────────────────────────────────────────────────────────
  // Fish entity template — SimpleFishController attached.
  // One template covers all species; size and speed are tuned via @property() in the editor.
  export const FishTemplate = new TemplateAsset('../Templates/Fish.hstf');

  // ── Scene Elements ────────────────────────────────────────────────────────────
  export const CubeTemplate   = new TemplateAsset('../Templates/Cube.hstf');
  export const BubbleTemplate = new TemplateAsset('../Templates/Sphere.hstf');
}
