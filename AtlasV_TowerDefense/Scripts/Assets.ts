/**
 * Assets.ts — Single source of truth for ALL TemplateAsset references.
 *
 * Workflow:
 *   1. Create the .hstf template in Horizon Studio.
 *   2. Add an entry here — this is the ONLY file to edit when a path changes.
 *   3. Reference the export from Defs files or services — never use new TemplateAsset() elsewhere.
 */
import { TemplateAsset, TextureAsset } from 'meta/worlds';

export namespace Assets {

  // ── Towers ────────────────────────────────────────────────────────────────
  export const Arrow  = new TemplateAsset('@Templates/Towers/ArrowTower.hstf');
  export const Cannon = new TemplateAsset('@Templates/Towers/CanonTower.hstf');
  export const Frost  = new TemplateAsset('@Templates/Towers/FrostTower.hstf');
  export const Laser  = new TemplateAsset('@Templates/Towers/LaserTower.hstf');

  // ── Enemies ───────────────────────────────────────────────────────────────
  export const EnemyBasic = new TemplateAsset('@Templates/Enemies/Enemy.hstf');
  export const EnemyFast  = new TemplateAsset('@Templates/Enemies/EnemyFast.hstf');
  export const EnemyTank  = new TemplateAsset('@Templates/Enemies/EnemyTank.hstf');
  export const EnemyBoss  = new TemplateAsset('@Templates/Enemies/EnemyBoss.hstf');

  // ── Shared ────────────────────────────────────────────────────────────────
  export const Particles       = new TemplateAsset('@Templates/Cube.hstf');
  export const Projectile      = new TemplateAsset('@Templates/Projectile.hstf');
  export const RangeIndicator  = new TemplateAsset('@Templates/RangeIndicator.hstf');
  export const HealthBar       = new TemplateAsset('@Templates/HealthBar.hstf');
  export const PathCell        = new TemplateAsset('@Templates/PathCell.hstf');
  export const FloatingText    = new TemplateAsset('@Templates/UI/FloatingText.hstf');
  export const Coin            = new TemplateAsset('@Templates/Coin.hstf'); // placeholder
}

export namespace NewTiles {
  export const Grass = new TemplateAsset('@Templates/Cube.hstf');;
  export const LeftToRight = new TemplateAsset('@Templates/Cube.hstf');
  export const DownToRight = new TemplateAsset('@Templates/Cube.hstf');
}

export namespace TowerIcons {
  export const BallistaTower = new TextureAsset("@Textures/balista_tower.png");
  export const CanonTower = new TextureAsset("@Textures/canon_tower.png");
  export const FrostTower = new TextureAsset("@Textures/frost_tower.png");
  export const LaserTower = new TextureAsset("@Textures/laser_tower.png");
}
