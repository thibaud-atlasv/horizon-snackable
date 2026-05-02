/**
 * CastData — Backward-compatible hub that delegates to CharacterRegistry.
 * Existing code can continue importing from here without changes.
 * New code should use characterRegistry directly.
 */

import type { Beat, FishCharacter, CastData, CatchSequenceData } from './Types';
import { AffectionTier } from './Types';
import { characterRegistry } from './CharacterRegistry';

// Re-export tier casts for any code that imports them directly
export { NEREIA_TIER1_CASTS } from './CastDataTier1';
export { NEREIA_TIER2_CASTS } from './CastDataTier2';
export { NEREIA_TIER3_CASTS } from './CastDataTier3';
export { NEREIA_TIER4_CASTS } from './CastDataTier4';
export { NEREIA_TIER5_CASTS, CATCH_SEQUENCE_DATA, DRIFT_AWAY_JOURNAL_TEXT } from './CastDataTier5';

// === Nereia Default Character (backward compat) ===
export function createNereia(): FishCharacter {
  const nereia = characterRegistry.getCharacter('nereia');
  if (!nereia) throw new Error('[CastData] Nereia not registered in CharacterRegistry');
  return nereia.initialState();
}

/**
 * Get the cast data for a given tier and cast index within that tier.
 * Defaults to 'nereia' for backward compatibility.
 */
export function getCastForTier(tier: AffectionTier, castIndexWithinTier: number, characterId: string = 'nereia'): CastData {
  const cast = characterRegistry.getCastForTier(characterId, tier, castIndexWithinTier);
  if (!cast) throw new Error(`[CastData] No cast found for ${characterId} tier ${tier} index ${castIndexWithinTier}`);
  return cast;
}

/**
 * Returns fresh beat copies for a given tier and cast index.
 * Each beat's `seen` is reset to false.
 */
export function getBeatsForTier(tier: AffectionTier, castIndexWithinTier: number = 0, characterId: string = 'nereia'): Beat[] {
  return characterRegistry.getBeatsForTier(characterId, tier, castIndexWithinTier);
}

/**
 * Get the number of casts available in a tier.
 */
export function getCastCountForTier(tier: AffectionTier, characterId: string = 'nereia'): number {
  return characterRegistry.getCastCountForTier(characterId, tier);
}

/**
 * Check if the player has exhausted all casts in the current tier.
 */
export function isTierExhausted(tier: AffectionTier, castIndexWithinTier: number, characterId: string = 'nereia'): boolean {
  return characterRegistry.isTierExhausted(characterId, tier, castIndexWithinTier);
}
