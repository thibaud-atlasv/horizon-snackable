/**
 * MoodIcons — TextureAsset declarations for mood tier icons.
 * Used by FloaterGame to display the current affection tier visually.
 */

import { TextureAsset } from 'meta/worlds';
import { AffectionTier } from './Types';

// Each TextureAsset MUST use a static string literal
export const MOOD_ICON_UNAWARE: TextureAsset = new TextureAsset("@sprites/mood_icon_unaware.png");
export const MOOD_ICON_CURIOUS: TextureAsset = new TextureAsset("@sprites/mood_icon_curious.png");
export const MOOD_ICON_FAMILIAR: TextureAsset = new TextureAsset("@sprites/mood_icon_familiar.png");
export const MOOD_ICON_TRUSTING: TextureAsset = new TextureAsset("@sprites/mood_icon_trusting.png");
export const MOOD_ICON_BONDED: TextureAsset = new TextureAsset("@sprites/mood_icon_bonded.png");

export function getMoodIconTexture(tier: AffectionTier): TextureAsset {
  switch (tier) {
    case AffectionTier.Unaware: return MOOD_ICON_UNAWARE;
    case AffectionTier.Curious: return MOOD_ICON_CURIOUS;
    case AffectionTier.Familiar: return MOOD_ICON_FAMILIAR;
    case AffectionTier.Trusting: return MOOD_ICON_TRUSTING;
    case AffectionTier.Bonded: return MOOD_ICON_BONDED;
    default: return MOOD_ICON_UNAWARE;
  }
}
