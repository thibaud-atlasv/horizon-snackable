/**
 * Assets.ts — Texture asset declarations for the merge game.
 * Each TextureAsset MUST use a static string literal (no variables or templates).
 */
import { TextureAsset } from 'meta/worlds';

// === Gummy blob creature tier sprites (indexed 0–10) ===
export const tier00Texture: TextureAsset = new TextureAsset("@sprites/tier_00.png");
export const tier01Texture: TextureAsset = new TextureAsset("@sprites/tier_01.png");
export const tier02Texture: TextureAsset = new TextureAsset("@sprites/tier_02.png");
export const tier03Texture: TextureAsset = new TextureAsset("@sprites/tier_03.png");
export const tier04Texture: TextureAsset = new TextureAsset("@sprites/tier_04.png");
export const tier05Texture: TextureAsset = new TextureAsset("@sprites/tier_05.png");
export const tier06Texture: TextureAsset = new TextureAsset("@sprites/tier_06.png");
export const tier07Texture: TextureAsset = new TextureAsset("@sprites/tier_07.png");
export const tier08Texture: TextureAsset = new TextureAsset("@sprites/tier_08.png");
export const tier09Texture: TextureAsset = new TextureAsset("@sprites/tier_09.png");
export const tier10Texture: TextureAsset = new TextureAsset("@sprites/tier_10.png");

// === UI sprites ===
export const logoHorizonTexture: TextureAsset = new TextureAsset("@sprites/logo_horizon.png");
export const titleTextTexture: TextureAsset = new TextureAsset("@sprites/title_text.png");
export const taglineTextTexture: TextureAsset = new TextureAsset("@sprites/tagline_text.png");

// === Background sprites ===
export const backgroundTexture: TextureAsset = new TextureAsset("@sprites/background.png");

/**
 * Tier textures array indexed by tier ID (0–10).
 * Used by GameRenderer for efficient lookup.
 */
export const TIER_TEXTURES: readonly TextureAsset[] = [
  tier00Texture,
  tier01Texture,
  tier02Texture,
  tier03Texture,
  tier04Texture,
  tier05Texture,
  tier06Texture,
  tier07Texture,
  tier08Texture,
  tier09Texture,
  tier10Texture,
];
