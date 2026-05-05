/**
 * SYS-05-JOURNAL: Journal Data Management
 * Manages: fish entry unlocking, observation recording, keepsake tracking.
 *
 * Now uses CharacterRegistry for fish data instead of hardcoded arrays.
 */

import { ExpressionState } from './Types';
import type { JournalFishEntry, JournalSaveData, LureReaction } from './Types';
import { characterRegistry } from './CharacterRegistry';
import { QuestSystem } from './QuestSystem';
import { FlagSystem } from './FlagSystem';
import { AffectionSystem } from './AffectionSystem';

// === Character Card Data (for journal teasing display) ===
export interface CharacterCardData {
  id: string;
  name: string;
  species: string;
  accentColor: string;
  unlocked: boolean;
  castsMade: number;
  observationCount: number;
  questHint: string;
  questName: string;
  tierName: string;
  tierColor: string;
  teaserHint: string; // Hint shown for locked characters
}

export class JournalSystem {
  private fishEntries: Map<string, JournalFishEntry> = new Map();

  constructor() {
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
      });
    }
  }

  // === Recording Observations ===

  /** Record a Cast completion for a fish. */
  recordCast(fishId: string, expressionsSeen: ExpressionState[]): void {
    const entry = this.fishEntries.get(fishId);
    if (!entry) return;

    if (!entry.unlocked) {
      entry.unlocked = true;
      const character = characterRegistry.getCharacter(fishId);
      if (character) {
        entry.knownFacts = [...character.staticFacts];
      }
      console.log(`[JournalSystem] Unlocked fish entry: ${fishId}`);
    }

    entry.castsMade++;

    for (const expr of expressionsSeen) {
      if (!entry.expressionsSeen.includes(expr)) {
        entry.expressionsSeen.push(expr);
      }
    }
  }

  addFact(fishId: string, fact: string): void {
    const entry = this.fishEntries.get(fishId);
    if (!entry) return;
    if (!entry.knownFacts.includes(fact)) {
      entry.knownFacts.push(fact);
      console.log(`[JournalSystem] New fact for ${fishId}: ${fact}`);
    }
  }



  // === Querying for Display ===

  getAllFishEntries(): JournalFishEntry[] {
    return Array.from(this.fishEntries.values());
  }

  getFishEntry(fishId: string): JournalFishEntry | undefined {
    return this.fishEntries.get(fishId);
  }

  getQuestHintForFish(fishId: string): string {
    const entry = this.fishEntries.get(fishId);
    if (!entry || !entry.unlocked) return '???';
    return characterRegistry.getQuestHint(fishId);
  }

  getQuestNameForFish(fishId: string): string {
    return characterRegistry.getQuestName(fishId);
  }


  isFishUnlocked(fishId: string): boolean {
    return this.fishEntries.get(fishId)?.unlocked ?? false;
  }

  // === Formatted Display Text (for ViewModel binding) ===

  getPondNotesText(fishId: string): string {
    const entry = this.fishEntries.get(fishId);
    if (!entry || !entry.unlocked) {
      return '[ Unknown Fish ]\n\nA dark shape seen beneath the surface.\nNot yet approached.';
    }

    const lines: string[] = [];
    lines.push(`${fishId.charAt(0).toUpperCase() + fishId.slice(1)} — ${entry.species}`);
    lines.push(`Casts: ${entry.castsMade}`);
    lines.push('');

    lines.push('— Observations —');
    for (const fact of entry.knownFacts) {
      lines.push(`• ${fact}`);
    }
    lines.push('');

    lines.push(`— Personal Quest: ${this.getQuestNameForFish(fishId)} —`);
    lines.push(this.getQuestHintForFish(fishId));

    return lines.join('\n');
  }

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

  getAllPondNotesText(): string {
    const allIds = characterRegistry.getAllCharacterIds();
    const sections: string[] = [];
    for (const fishId of allIds) {
      sections.push(this.getPondNotesText(fishId));
    }
    return sections.join('\n\n━━━━━━━━━━━━━━━\n\n');
  }

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


  // === Character Teasing System ===

  getCharacterCardsData(affectionValues?: Record<string, number>): CharacterCardData[] {
    const allCharacters = characterRegistry.getAllCharacters();
    const cards: CharacterCardData[] = [];
    const affectionSystem = new AffectionSystem();

    for (const char of allCharacters) {
      const entry = this.fishEntries.get(char.id);
      const unlocked = entry?.unlocked ?? false;
      const affectionValue = affectionValues?.[char.id] ?? 0;
      const tierInfo = affectionSystem.getTierInfo(affectionValue);

      cards.push({
        id: char.id,
        name: unlocked ? char.name : '???',
        species: unlocked ? char.species : 'Unknown',
        accentColor: unlocked ? char.accentColor : '#3A4A5A',
        unlocked,
        castsMade: entry?.castsMade ?? 0,
        observationCount: entry?.knownFacts.length ?? 0,
        questHint: unlocked ? this.getQuestHintForFish(char.id) : '???',
        questName: unlocked ? this.getQuestNameForFish(char.id) : '???',
        teaserHint: this.getTeaserHint(char),
        tierName: unlocked ? tierInfo.name : '???',
        tierColor: unlocked ? tierInfo.color : '#3A4A5A',
      });
    }

    return cards;
  }

  private getTeaserHint(char: { id: string; species: string; lakeZones: string[] }): string {
    const zoneHints: Record<string, string> = {
      near: 'Likes shallow waters...',
      mid: 'Dwells in the middle depths...',
      far: 'Hides in the deep...',
    };
    const zone = char.lakeZones[0] ?? 'mid';
    return zoneHints[zone] ?? 'A mysterious presence beneath the surface...';
  }

  getMetCounterText(): string {
    const total = characterRegistry.getAllCharacterIds().length;
    let met = 0;
    for (const entry of this.fishEntries.values()) {
      if (entry.unlocked) met++;
    }
    return `${met}/${total} characters met`;
  }

  getMetCount(): number {
    let met = 0;
    for (const entry of this.fishEntries.values()) {
      if (entry.unlocked) met++;
    }
    return met;
  }

  getCharacterListText(): string {
    const cards = this.getCharacterCardsData();
    const lines: string[] = [];

    lines.push(`— ${this.getMetCounterText()} —`);
    lines.push('');

    for (const card of cards) {
      if (card.unlocked) {
        const nameCapitalized = card.name.charAt(0).toUpperCase() + card.name.slice(1);
        lines.push(`◈ ${nameCapitalized} — ${card.species}`);
        lines.push(`  ${card.castsMade} casts · ${card.observationCount} observations`);
        lines.push(`  Quest: ${card.questName}`);
        lines.push(`  ↳ ${card.questHint}`);
      } else {
        lines.push('🔒 ??? — Unknown');
        lines.push(`  ${card.teaserHint}`);
      }
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
    };
  }

  deserialize(data: JournalSaveData): void {
    if (data.fishEntries) {
      for (const [id, entry] of Object.entries(data.fishEntries)) {
        this.fishEntries.set(id, { ...entry });
      }
    }
    // Old saves may have data.keepsakes — ignored (deprecated)
  }
}
