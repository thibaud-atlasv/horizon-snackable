/**
 * SYS-08-QUESTS: Personal Quest Hints
 * Delegates to CharacterRegistry for quest data.
 *
 * Each character defines a single questHint string in their
 * CharacterData_<Name>.ts file.
 */

import { characterRegistry } from './CharacterRegistry';

export function getQuestHint(fishId: string): string {
  return characterRegistry.getQuestHint(fishId);
}

export function getQuestName(fishId: string): string {
  return characterRegistry.getQuestName(fishId);
}
