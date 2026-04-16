/**
 * Assets.ts — Single source of truth for ALL TemplateAsset references.
 *
 * Workflow:
 *   1. Create the .hstf template in Horizon Studio.
 *   2. Add an entry here — this is the ONLY file to edit when a path changes.
 *   3. Reference the export from Defs files or services — never use new TemplateAsset() elsewhere.
 */
import { TemplateAsset } from 'meta/worlds';

export namespace Assets {

  // ── Towers ────────────────────────────────────────────────────────────────
  export const Arrow  = new TemplateAsset('@Templates/Towers/VoxelArrowTower.hstf');
  export const Cannon = new TemplateAsset('@Templates/Towers/VoxelCannonTower.hstf');
  export const Frost  = new TemplateAsset('@Templates/Towers/VoxelFrostTower.hstf');
  export const Laser  = new TemplateAsset('@Templates/Towers/VoxelLaserTower.hstf');

  // ── Enemies ───────────────────────────────────────────────────────────────
  export const EnemyBasic = new TemplateAsset('@Templates/Enemies/Enemy.hstf');
  export const EnemyFast  = new TemplateAsset('@Templates/Enemies/Enemy.hstf');
  export const EnemyTank  = new TemplateAsset('@Templates/Enemies/Enemy.hstf');
  export const EnemyBoss  = new TemplateAsset('@Templates/Enemies/Enemy.hstf');

  // ── Shared ────────────────────────────────────────────────────────────────
  export const Particles       = new TemplateAsset('@Templates/Cube.hstf');
  export const Projectile      = new TemplateAsset('@Templates/Projectile.hstf');
  export const RangeIndicator  = new TemplateAsset('@Templates/RangeIndicator.hstf');
  export const HealthBar       = new TemplateAsset('@Templates/HealthBar.hstf');
  export const PathCell        = new TemplateAsset('@Templates/PathCell.hstf');
  export const FloatingText    = new TemplateAsset('@Templates/UI/FloatingText.hstf');
}


export namespace NewTiles {
  export const Grass = new TemplateAsset('@Templates/Env/Tile.hstf');;
  export const LeftToRight = new TemplateAsset('@Templates/Env/Path.hstf');
  export const DownToRight = new TemplateAsset('@Templates/Env/Angle.hstf');
}

export namespace Tiles {
  export const Hill = new TemplateAsset('@Models/FBX format/tile-hill.fbx:template');
  export const Rock = new TemplateAsset('@Models/FBX format/tile-rock.fbx:template');
  export const Tree = new TemplateAsset('@Models/FBX format/tile-tree.fbx:template');
  export const TreeDouble = new TemplateAsset('@Models/FBX format/tile-tree-double.fbx:template');
  export const TreeQuad = new TemplateAsset('@Models/FBX format/tile-tree-quad.fbx:template');
  export const Crystal = new TemplateAsset('@Models/FBX format/tile-crystal.fbx:template');
  export const RightToLeftEnd = new TemplateAsset('@Models/FBX format/tile-spawn-end.fbx:template')
  
  export const Grass = new TemplateAsset('@Models/FBX format/tile.fbx:template');;
  export const TopToRight = new TemplateAsset('@Models/FBX format/tile-corner-round.fbx:template');
  export const LeftToRight = new TemplateAsset('@Models/FBX format/tile-straight.fbx:template');
}