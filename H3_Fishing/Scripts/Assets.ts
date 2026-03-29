/**
 * Single source of truth for ALL TemplateAsset references.
 *
 * Workflow:
 *   1. Create a new .hstf template in Horizon Studio.
 *   2. Add an entry here.
 */
import { TemplateAsset } from 'meta/worlds';

export namespace Assets {
  // ── Fish — Zone 1 ─────────────────────────────────────────────────────────────
  export const ClownFish   = new TemplateAsset('../Templates/ClownFish.hstf');
  export const AngelFish   = new TemplateAsset('../Templates/AngelFish.hstf');
  export const TigerFish   = new TemplateAsset('../Templates/ClownFish.hstf');
  export const BlueTang    = new TemplateAsset('../Templates/ClownFish.hstf');
  export const Seahorse    = new TemplateAsset('../Templates/ClownFish.hstf');
  export const GoldenManta = new TemplateAsset('../Templates/ClownFish.hstf');

  // ── Fish — Zone 2 ─────────────────────────────────────────────────────────────
  export const PufferFish       = new TemplateAsset('../Templates/ClownFish.hstf');
  export const LanternFish      = new TemplateAsset('../Templates/ClownFish.hstf');
  export const GhostEel         = new TemplateAsset('../Templates/ClownFish.hstf');
  export const CrystalJellyfish = new TemplateAsset('../Templates/ClownFish.hstf');
  export const AnglerFish       = new TemplateAsset('../Templates/ClownFish.hstf');
  export const DeepDragon       = new TemplateAsset('../Templates/ClownFish.hstf');

  // ── Fish — Zone 3 ─────────────────────────────────────────────────────────────
  export const ShadowFish       = new TemplateAsset('../Templates/ClownFish.hstf');
  export const AbyssEel         = new TemplateAsset('../Templates/ClownFish.hstf');
  export const VoidRay          = new TemplateAsset('../Templates/ClownFish.hstf');
  export const NightManta       = new TemplateAsset('../Templates/ClownFish.hstf');
  export const AbyssalKing      = new TemplateAsset('../Templates/ClownFish.hstf');
  export const AncientLeviathan = new TemplateAsset('../Templates/ClownFish.hstf');

  // ── Scene Elements ────────────────────────────────────────────────────────────
  export const CubeTemplate   = new TemplateAsset('../Templates/Cube.hstf');
  export const BubbleTemplate = new TemplateAsset('../Templates/Bubble.hstf');
}
