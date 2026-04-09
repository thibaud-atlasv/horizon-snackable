/**
 * Single source of truth for ALL TemplateAsset references.
 *
 * Workflow:
 *   1. Create a new .hstf template in Horizon Studio.
 *   2. Add an entry here.
 */
import { TemplateAsset } from 'meta/worlds';

export namespace Assets {
  
  export const ClownFish    = new TemplateAsset('../Templates/Fish/ClownFish.hstf');
  export const AngelFish    = new TemplateAsset('../Templates/Fish/AngelFish.hstf');
  export const Dolphin      = new TemplateAsset('../Templates/Fish/Dolphin.hstf');
  export const Dolphinv2      = new TemplateAsset('../Templates/Fish/Dolphin_v2.hstf');
  export const Fish_1       = new TemplateAsset('../Templates/Fish/Fish_1.hstf');
  export const Fish_1v2       = new TemplateAsset('../Templates/Fish/Fish_1_v2.hstf');
  export const Fish_2       = new TemplateAsset('../Templates/Fish/Fish_2.hstf');
  export const Fish_2v2       = new TemplateAsset('../Templates/Fish/Fish_2_v2.hstf');
  export const Fish_3       = new TemplateAsset('../Templates/Fish/Fish_3.hstf');
  export const Fish_3v2       = new TemplateAsset('../Templates/Fish/Fish_3_v2.hstf');
  export const Fish_4       = new TemplateAsset('../Templates/Fish/Fish_4.hstf');
  export const Fish_4v2       = new TemplateAsset('../Templates/Fish/Fish_4_v2.hstf');
  export const Fish_5       = new TemplateAsset('../Templates/Fish/Fish_5.hstf');
  export const Fish_5v2       = new TemplateAsset('../Templates/Fish/Fish_5_v2.hstf');
  export const RainbowFish  = new TemplateAsset('../Templates/Fish/RainbowFish.hstf');
  export const Shark        = new TemplateAsset('../Templates/Fish/Shark.hstf');
  export const Sharkv2        = new TemplateAsset('../Templates/Fish/Shark_v2.hstf');
  export const Tortoise     = new TemplateAsset('../Templates/Fish/Tortoise.hstf');

  // ── Scene Elements ────────────────────────────────────────────────────────────
  export const CubeTemplate   = new TemplateAsset('../Templates/Cube.hstf');
  export const BubbleTemplate = new TemplateAsset('../Templates/Bubble.hstf');
}
