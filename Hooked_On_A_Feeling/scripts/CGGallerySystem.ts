/**
 * CGGallerySystem — Manages CG (Computer Graphics) gallery unlocks and state.
 * Handles: CG unlock tracking, serialization for save/load, gallery display data.
 *
 * CGs are defined per-character in CharacterData files and registered here.
 */

import type { CGData } from './Types';

// === CG Registry: All CGs in the game ===
const CG_REGISTRY: CGData[] = [
  {
    id: 'nereia_love_end',
    characterId: 'nereia',
    name: 'The Last Morning',
    description: 'The data ends here. The lake remembers.',
    unlockCondition: 'Choose "Reel" in Nereia\'s catch sequence',
  },
];

export class CGGallerySystem {
  private unlockedCGs: Set<string> = new Set();
  private cgViewerActive: boolean = false;
  private currentViewingCG: string | null = null;
  private viewerFadeAlpha: number = 0;

  // === CG Unlock Management ===

  /** Unlock a CG by ID. Returns true if newly unlocked. */
  unlockCG(cgId: string): boolean {
    if (this.unlockedCGs.has(cgId)) return false;
    this.unlockedCGs.add(cgId);
    console.log(`[CGGallerySystem] CG unlocked: ${cgId}`);
    return true;
  }

  /** Check if a CG is unlocked */
  isCGUnlocked(cgId: string): boolean {
    return this.unlockedCGs.has(cgId);
  }

  /** Get all CG definitions */
  getAllCGs(): CGData[] {
    return CG_REGISTRY;
  }

  /** Get CGs for a specific character */
  getCGsForCharacter(characterId: string): CGData[] {
    return CG_REGISTRY.filter(cg => cg.characterId === characterId);
  }

  /** Get total and unlocked counts */
  getProgress(): { total: number; unlocked: number } {
    return {
      total: CG_REGISTRY.length,
      unlocked: this.unlockedCGs.size,
    };
  }

  // === CG Viewer State ===

  /** Open fullscreen CG viewer */
  openViewer(cgId: string): void {
    this.cgViewerActive = true;
    this.currentViewingCG = cgId;
    this.viewerFadeAlpha = 0;
    console.log(`[CGGallerySystem] Viewer opened: ${cgId}`);
  }

  /** Close fullscreen CG viewer */
  closeViewer(): void {
    this.cgViewerActive = false;
    this.currentViewingCG = null;
    this.viewerFadeAlpha = 0;
    console.log('[CGGallerySystem] Viewer closed');
  }

  /** Update viewer fade animation. Returns current alpha. */
  updateViewer(dt: number): number {
    if (this.cgViewerActive && this.viewerFadeAlpha < 1) {
      this.viewerFadeAlpha = Math.min(1, this.viewerFadeAlpha + dt * 2.5); // 0.4s fade-in
    }
    return this.viewerFadeAlpha;
  }

  isViewerActive(): boolean { return this.cgViewerActive; }
  getCurrentCGId(): string | null { return this.currentViewingCG; }
  getViewerAlpha(): number { return this.viewerFadeAlpha; }

  // === Gallery Text for Journal Display ===

  /** Get formatted collection text for the journal Collection tab */
  getCollectionText(): string {
    const progress = this.getProgress();
    const lines: string[] = [];
    lines.push(`— CG Collection (${progress.unlocked}/${progress.total}) —`);
    lines.push('');

    // Group by character
    const characterGroups = new Map<string, CGData[]>();
    for (const cg of CG_REGISTRY) {
      const group = characterGroups.get(cg.characterId) || [];
      group.push(cg);
      characterGroups.set(cg.characterId, group);
    }

    for (const [characterId, cgs] of characterGroups) {
      const charName = characterId.charAt(0).toUpperCase() + characterId.slice(1);
      lines.push(`◆ ${charName}`);
      for (const cg of cgs) {
        if (this.unlockedCGs.has(cg.id)) {
          lines.push(`  ✦ ${cg.name}`);
          lines.push(`    "${cg.description}"`);
          lines.push(`    [Tap to view]`);
        } else {
          lines.push(`  🔒 ???`);
          lines.push(`    (Locked)`);
        }
      }
      lines.push('');
    }

    if (progress.unlocked === 0) {
      lines.push('No CGs unlocked yet.');
      lines.push('Continue your journey to discover special moments.');
    }

    return lines.join('\n');
  }

  // === Save/Load ===

  serialize(): string[] {
    return Array.from(this.unlockedCGs);
  }

  deserialize(data: string[]): void {
    this.unlockedCGs = new Set(data || []);
    console.log(`[CGGallerySystem] Loaded ${this.unlockedCGs.size} unlocked CGs`);
  }
}
