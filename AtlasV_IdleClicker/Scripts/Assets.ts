/**
 * Assets.ts — Single source of truth for ALL TemplateAsset references.
 *
 * Workflow:
 *   1. Create a new .hstf template in Horizon Studio.
 *   2. Add an entry here.
 *   3. Reference it from the relevant Def or component — never via @property().
 */
import { TemplateAsset } from 'meta/worlds';

export namespace Assets {

  // ── Generators ────────────────────────────────────────────────────────────
  // Add one entry per generator type that has a scene visual.
  // export const CursorTemplate = new TemplateAsset('../Templates/Generators/Cursor.hstf');

  // ── UI / FX ───────────────────────────────────────────────────────────────
  // DISABLED: 3D floating text replaced by pure XAML 2D system (FloatingTextUIComponent)
  // export const FloatingTextTemplate = new TemplateAsset('../Templates/GameplayObjects/FloatingText.hstf');
}
