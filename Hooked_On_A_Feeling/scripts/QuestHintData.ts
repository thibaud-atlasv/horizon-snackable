/**
 * SYS-08-QUESTS: Personal Quest Hints
 * Now delegates to CharacterRegistry for quest data.
 * This file provides backward-compatible getQuestHint() and getQuestName() functions.
 *
 * New characters define their quest hints in their CharacterData_<Name>.ts file.
 */

import { AffectionTier } from './Types';
import { characterRegistry } from './CharacterRegistry';

export interface QuestHint {
  tier: AffectionTier;
  text: string;
}

export interface FishQuestHints {
  fishId: string;
  questName: string;
  hints: QuestHint[];
}

/**
 * Get the appropriate quest hint for a fish based on current affection tier.
 * Returns the highest-tier hint that the player has reached.
 */
export function getQuestHint(fishId: string, currentTier: AffectionTier): string {
  return characterRegistry.getQuestHint(fishId, currentTier);
}

/**
 * Get the quest name for a fish.
 */
export function getQuestName(fishId: string): string {
  return characterRegistry.getQuestName(fishId);
}
