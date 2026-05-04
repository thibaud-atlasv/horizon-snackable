/**
 * SYS-05-JOURNAL: MUSEUM variant — Journal Data Management
 * Manages: fish entry unlocking, observation recording, keepsake tracking.
 * Three tabs: Pond Notes, Lure Box, Keepsakes
 *
 * Now uses CharacterRegistry for fish data instead of hardcoded arrays.
 */

import { ExpressionState, AffectionTier } from './Types';
import type { JournalFishEntry, Keepsake, JournalSaveData, LureReaction, QuestRequirement } from './Types';
import { characterRegistry } from './CharacterRegistry';
import { QuestSystem } from './QuestSystem';
import { FlagSystem } from './FlagSystem';

export class JournalSystem {
  private fishEntries: Map<string, JournalFishEntry> = new Map();
  private keepsakes: Keepsake[] = [];

  constructor() {
    // Initialize entries for all registered characters
    const allIds = characterRegistry.getAllCharacterIds();
    for (const fishId of allIds) {
      const character = characterRegistry.getCharacter(fishId);
      this.fishEntries.set(fishId, {
        fishId,
        unlocked: false,
        species: character?.species ?? 'Unknown',
        knownFacts: [],
        expressionsSeen: [],
        castsMade: 0,
        currentQuestHintTier: 1,
      });
    }
  }

  // === Recording Observations ===

  /**
   * Record a Cast completion for a fish.
   * Call after each Cast with the fish's ID and current tier.
   */
  recordCast(fishId: string, tier: AffectionTier, expressionsSeen: ExpressionState[]): void {
    const entry = this.fishEntries.get(fishId);
    if (!entry) return;

    // Unlock on first meeting
    if (!entry.unlocked) {
      entry.unlocked = true;
      // Add base facts on first discovery from character config
      const character = characterRegistry.getCharacter(fishId);
      if (character) {
        entry.knownFacts = [...character.staticFacts];
      }
      console.log(`[JournalSystem] Unlocked fish entry: ${fishId}`);
    }

    entry.castsMade++;
    entry.currentQuestHintTier = tier;

    // Record new expressions
    for (const expr of expressionsSeen) {
      if (!entry.expressionsSeen.includes(expr)) {
        entry.expressionsSeen.push(expr);
      }
    }
  }

  /**
   * Add a discovery fact to a fish entry.
   */
  addFact(fishId: string, fact: string): void {
    const entry = this.fishEntries.get(fishId);
    if (!entry) return;
    if (!entry.knownFacts.includes(fact)) {
      entry.knownFacts.push(fact);
      console.log(`[JournalSystem] New fact for ${fishId}: ${fact}`);
    }
  }

  /**
   * Add a keepsake to the collection.
   */
  addKeepsake(keepsake: Keepsake): void {
    if (!this.keepsakes.find(k => k.id === keepsake.id)) {
      this.keepsakes.push(keepsake);
      console.log(`[JournalSystem] New keepsake: ${keepsake.name}`);
    }
  }

  // === Querying for Display ===

  /** Get all fish entries (including locked ones for silhouette display) */
  getAllFishEntries(): JournalFishEntry[] {
    return Array.from(this.fishEntries.values());
  }

  /** Get a specific fish entry */
  getFishEntry(fishId: string): JournalFishEntry | undefined {
    return this.fishEntries.get(fishId);
  }

  /** Get quest hint for a fish at their current tier */
  getQuestHintForFish(fishId: string): string {
    const entry = this.fishEntries.get(fishId);
    if (!entry || !entry.unlocked) return '???';
    return characterRegistry.getQuestHint(fishId, entry.currentQuestHintTier as AffectionTier);
  }

  /** Get quest name for a fish */
  getQuestNameForFish(fishId: string): string {
    return characterRegistry.getQuestName(fishId);
  }

  /** Get all keepsakes */
  getKeepsakes(): Keepsake[] {
    return this.keepsakes;
  }

  /** Check if a fish is unlocked */
  isFishUnlocked(fishId: string): boolean {
    return this.fishEntries.get(fishId)?.unlocked ?? false;
  }

  // === Formatted Display Text (for ViewModel binding) ===

  /**
   * Get formatted Pond Notes text for a specific fish.
   */
  getPondNotesText(fishId: string): string {
    const entry = this.fishEntries.get(fishId);
    if (!entry || !entry.unlocked) {
      return '[ Unknown Fish ]\n\nA dark shape seen beneath the surface.\nNot yet approached.';
    }

    const lines: string[] = [];
    lines.push(`${fishId.charAt(0).toUpperCase() + fishId.slice(1)} — ${entry.species}`);
    lines.push(`Casts: ${entry.castsMade}`);
    lines.push('');

    // Known facts
    lines.push('— Observations —');
    for (const fact of entry.knownFacts) {
      lines.push(`• ${fact}`);
    }
    lines.push('');

    // Quest hint
    lines.push(`— Personal Quest: ${this.getQuestNameForFish(fishId)} —`);
    lines.push(this.getQuestHintForFish(fishId));

    return lines.join('\n');
  }

  /**
   * Get formatted quest status text for all characters with quests.
   * Shows active quests with their progress.
   */
  getQuestStatusText(questSystem: QuestSystem, flagSystem: FlagSystem): string {
    const allCharacters = characterRegistry.getAllCharacters();
    const lines: string[] = [];
    lines.push('— Active Quests —');
    lines.push('');

    let hasActiveQuests = false;
    for (const char of allCharacters) {
      if (!char.questRequirement) continue;
      const progressText = questSystem.getQuestProgressText(char.id, char.questRequirement, flagSystem);
      const isComplete = progressText.startsWith('✓');
      if (!isComplete) {
        hasActiveQuests = true;
        lines.push(`◆ ${char.name}`);
        lines.push(`  ${progressText}`);
        lines.push('');
      }
    }

    if (!hasActiveQuests) {
      lines.push('No active quests.');
      lines.push('');
    }

    // Show completed quests
    const completedLines: string[] = [];
    for (const char of allCharacters) {
      if (!char.questRequirement) continue;
      const progressText = questSystem.getQuestProgressText(char.id, char.questRequirement, flagSystem);
      if (progressText.startsWith('✓')) {
        completedLines.push(`✓ ${char.name} — ${progressText.substring(2)}`);
      }
    }

    if (completedLines.length > 0) {
      lines.push('— Completed —');
      for (const cl of completedLines) {
        lines.push(cl);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get formatted Pond Notes for ALL fish (scrollable list).
   */
  getAllPondNotesText(): string {
    const allIds = characterRegistry.getAllCharacterIds();
    const sections: string[] = [];
    for (const fishId of allIds) {
      sections.push(this.getPondNotesText(fishId));
    }
    return sections.join('\n\n━━━━━━━━━━━━━━━\n\n');
  }

  /**
   * Get formatted Lure Box text.
   */
  getLureBoxText(ownedLureIds: string[], reactions: LureReaction[]): string {
    if (ownedLureIds.length === 0) {
      return 'No lures in inventory.';
    }

    const lureNames: Record<string, string> = {
      red_spinner: 'Red Spinner',
      gold_teardrop: 'Gold Teardrop',
      feather_fly: 'Feather Fly',
      night_lure: 'Night Lure',
      shell_hook: 'Shell Hook',
      bare_hook: 'Bare Hook',
    };

    const lines: string[] = [];
    for (const lureId of ownedLureIds) {
      const name = lureNames[lureId] ?? lureId;
      lines.push(`◆ ${name}`);

      const lureReactions = reactions.filter(r => r.lureId === lureId);
      if (lureReactions.length === 0) {
        lines.push('  No observations recorded yet.');
      } else {
        for (const r of lureReactions) {
          const fishName = r.fishId.charAt(0).toUpperCase() + r.fishId.slice(1);
          const sentiment = r.positiveActions > r.negativeActions ? '(positive)' :
                           r.negativeActions > r.positiveActions ? '(wary)' : '(neutral)';
          lines.push(`  • Used with ${fishName} ×${r.castCount} ${sentiment}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get formatted Keepsakes text.
   */
  getKeepsakesText(): string {
    if (this.keepsakes.length === 0) {
      return 'No keepsakes yet.\n\nFish sometimes attach gifts to your hook.\nKeep visiting — and keep listening.';
    }

    const lines: string[] = [];
    for (const k of this.keepsakes) {
      const giverName = k.giftedBy.charAt(0).toUpperCase() + k.giftedBy.slice(1);
      lines.push(`✦ ${k.name}`);
      lines.push(`  From: ${giverName}`);
      lines.push(`  "${k.fishPerspective}"`);
      lines.push(`  (You see: ${k.fishermanPerspective})`);
      lines.push('');
    }

    return lines.join('\n');
  }

  // === Save/Load ===

  serialize(): JournalSaveData {
    const fishEntries: Record<string, JournalFishEntry> = {};
    for (const [id, entry] of this.fishEntries) {
      fishEntries[id] = { ...entry };
    }
    return {
      fishEntries,
      keepsakes: [...this.keepsakes],
    };
  }

  deserialize(data: JournalSaveData): void {
    if (data.fishEntries) {
      for (const [id, entry] of Object.entries(data.fishEntries)) {
        this.fishEntries.set(id, { ...entry });
      }
    }
    if (data.keepsakes) {
      this.keepsakes = [...data.keepsakes];
    }
  }
}
