/**
 * CastData — Backward-compatible hub that delegates to CharacterRegistry.
 * Existing code can continue importing from here without changes.
 * New code should use characterRegistry directly.
 */

import type { Beat, FishCharacter, CastData } from './Types';
import { characterRegistry } from './CharacterRegistry';

/** Default Nereia FishCharacter factory (legacy, kept for backward compat). */
export function createNereia(): FishCharacter {
  const nereia = characterRegistry.getCharacter('nereia');
  if (!nereia) throw new Error('[CastData] Nereia not registered in CharacterRegistry');
  return nereia.initialState();
}

/** Get the cast at a given index for a character. Defaults to 'nereia'. */
export function getCast(castIndex: number, characterId: string = 'nereia'): CastData {
  const cast = characterRegistry.getCast(characterId, castIndex);
  if (!cast) throw new Error(`[CastData] No cast found for ${characterId} at index ${castIndex}`);
  return cast;
}

/** Returns fresh beat copies (seen = false) for the cast at the given index. */
export function getBeats(castIndex: number = 0, characterId: string = 'nereia'): Beat[] {
  return characterRegistry.getBeats(characterId, castIndex);
}

/** Total cast count for a character. */
export function getCastCount(characterId: string = 'nereia'): number {
  return characterRegistry.getCastCount(characterId);
}

/** Whether the player has progressed past the last cast. */
export function isArcExhausted(castIndex: number, characterId: string = 'nereia'): boolean {
  return characterRegistry.isArcExhausted(characterId, castIndex);
}
