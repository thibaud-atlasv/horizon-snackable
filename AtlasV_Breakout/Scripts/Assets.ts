import { TemplateAsset } from 'meta/worlds';

/**
 * Centralizes all TemplateAsset references for the project.
 * Add a new brick template here, then reference it in LevelConfig.ts.
 */
export const BrickAssets = {
  Normal:    new TemplateAsset('@Templates/GameplayObjects/Brick.hstf'),
} as const;

/**
 * Per-type power-up pickup templates.
 * Each entry controls the visuals, VFX, and audio of the spawned pickup.
 * Add a new entry here when adding a new PowerUpType.
 */
export const PowerUpAssets = {
} as const;


export const Particle = new TemplateAsset('@Templates/Particle.hstf');
