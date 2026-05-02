/**
 * CharacterRegistry — Central registry for all fish characters.
 * Provides lookup by ID, listing of available characters, and
 * convenience functions for game logic.
 *
 * To add a new character:
 * 1. Create CharacterData_<Name>.ts (copy CharacterData_Nereia.ts as template)
 * 2. Import and register here with characterRegistry.register(YOUR_CHARACTER)
 */

import type { CharacterConfig, CastData, Beat, CatchSequenceData } from './Types';
import { AffectionTier } from './Types';
import { NEREIA_CHARACTER } from './CharacterData_Nereia';
import { KASHA_CHARACTER } from './CharacterData_Kasha';

class CharacterRegistry {
  private characters: Map<string, CharacterConfig> = new Map();

  /** Register a character configuration */
  register(config: CharacterConfig): void {
    this.characters.set(config.id, config);
  }

  /** Get a character by ID */
  getCharacter(id: string): CharacterConfig | undefined {
    return this.characters.get(id);
  }

  /** Get all registered character IDs */
  getAllCharacterIds(): string[] {
    return Array.from(this.characters.keys());
  }

  /** Get all registered characters */
  getAllCharacters(): CharacterConfig[] {
    return Array.from(this.characters.values());
  }

  /**
   * Get characters available given current flags and equipped lure.
   * Checks unlockCondition and lure attraction.
   */
  getAvailableCharacters(
    flags: Record<string, boolean | number>,
    equippedLureId?: string,
  ): CharacterConfig[] {
    return this.getAllCharacters().filter(c => {
      if (!c.unlockCondition(flags)) return false;
      if (equippedLureId) {
        // Character responds to this lure (preferred or not disliked)
        return c.preferredLures.includes(equippedLureId) ||
               !c.dislikedLures.includes(equippedLureId);
      }
      return true;
    });
  }

  /** Get cast data for a character's tier and index */
  getCastForTier(characterId: string, tier: AffectionTier, castIndex: number): CastData | undefined {
    const character = this.characters.get(characterId);
    if (!character) return undefined;
    const casts = character.getCastsForTier(tier);
    const idx = Math.min(castIndex, casts.length - 1);
    return casts[idx];
  }

  /** Get beat data for a character's tier and cast index */
  getBeatsForTier(characterId: string, tier: AffectionTier, castIndex: number = 0): Beat[] {
    const cast = this.getCastForTier(characterId, tier, castIndex);
    if (!cast) return [];
    return cast.beats.map(b => ({ ...b, seen: false }));
  }

  /** Get number of casts available for a character in a tier */
  getCastCountForTier(characterId: string, tier: AffectionTier): number {
    const character = this.characters.get(characterId);
    if (!character) return 0;
    return character.getCastsForTier(tier).length;
  }

  /** Check if all casts in a tier are exhausted */
  isTierExhausted(characterId: string, tier: AffectionTier, castIndex: number): boolean {
    const character = this.characters.get(characterId);
    if (!character) return true;
    return castIndex >= character.getCastsForTier(tier).length;
  }

  /** Get catch sequence data for a character */
  getCatchSequenceData(characterId: string): CatchSequenceData | undefined {
    return this.characters.get(characterId)?.catchSequenceData;
  }

  /** Get quest hint for a character at a given tier */
  getQuestHint(characterId: string, currentTier: AffectionTier): string {
    const character = this.characters.get(characterId);
    if (!character) return 'No quest data available.';
    let bestHint = character.questHints[0];
    for (const hint of character.questHints) {
      if (hint.tier <= currentTier) bestHint = hint;
    }
    return bestHint?.text ?? 'A mystery remains...';
  }

  /** Get quest name for a character */
  getQuestName(characterId: string): string {
    return this.characters.get(characterId)?.questName ?? 'Unknown Quest';
  }
}

// === Singleton Registry ===
export const characterRegistry = new CharacterRegistry();

// === Register all implemented characters ===
characterRegistry.register(NEREIA_CHARACTER);
characterRegistry.register(KASHA_CHARACTER);
