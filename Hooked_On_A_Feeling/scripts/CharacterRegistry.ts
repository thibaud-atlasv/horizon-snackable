/**
 * CharacterRegistry — Central registry for all fish characters.
 * Provides lookup by ID, listing of available characters, and
 * convenience functions for game logic.
 *
 * To add a new character:
 * 1. Create CharacterData_<Name>.ts (copy CharacterData_Nereia.ts as template)
 * 2. Import and register here with characterRegistry.register(YOUR_CHARACTER)
 */

import type { CharacterConfig, CastData, Beat, CatchSequenceData, LakeZone } from './Types';
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
        return c.preferredLures.includes(equippedLureId) ||
               !c.dislikedLures.includes(equippedLureId);
      }
      return true;
    });
  }

  /** Get characters that prefer a given lure */
  getCharactersByLure(lureId: string): CharacterConfig[] {
    return this.getAllCharacters().filter(c =>
      c.preferredLures.includes(lureId) && !c.dislikedLures.includes(lureId),
    );
  }

  /** Get characters that dislike a given lure */
  getCharactersDislikingLure(lureId: string): CharacterConfig[] {
    return this.getAllCharacters().filter(c => c.dislikedLures.includes(lureId));
  }

  /** Get characters that appear in a given lake zone */
  getCharactersByZone(zone: LakeZone): CharacterConfig[] {
    return this.getAllCharacters().filter(c => c.lakeZones.includes(zone));
  }

  /** Get characters that match both a zone and lure preference */
  getCharactersForZoneAndLure(zone: LakeZone, lureId: string): CharacterConfig[] {
    return this.getAllCharacters().filter(c =>
      c.lakeZones.includes(zone) &&
      c.preferredLures.includes(lureId) &&
      !c.dislikedLures.includes(lureId),
    );
  }

  /** Get a cast by index for a character (clamped to valid range). */
  getCast(characterId: string, castIndex: number): CastData | undefined {
    const character = this.characters.get(characterId);
    if (!character) return undefined;
    const casts = character.getCasts();
    if (casts.length === 0) return undefined;
    const idx = Math.min(Math.max(castIndex, 0), casts.length - 1);
    return casts[idx];
  }

  /** Get the beats of the cast at the given index for a character. */
  getBeats(characterId: string, castIndex: number = 0): Beat[] {
    const cast = this.getCast(characterId, castIndex);
    if (!cast) return [];
    return cast.beats.map(b => ({ ...b, seen: false }));
  }

  /** Total number of casts in this character's arc. */
  getCastCount(characterId: string): number {
    const character = this.characters.get(characterId);
    if (!character) return 0;
    return character.getCasts().length;
  }

  /** Whether the player has progressed past the last available cast. */
  isArcExhausted(characterId: string, castIndex: number): boolean {
    return castIndex >= this.getCastCount(characterId);
  }

  /** Get catch sequence data for a character */
  getCatchSequenceData(characterId: string): CatchSequenceData | undefined {
    return this.characters.get(characterId)?.catchSequenceData;
  }

  /** Get the (single) quest hint string for a character. */
  getQuestHint(characterId: string): string {
    return this.characters.get(characterId)?.questHint ?? 'A mystery remains...';
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
