/**
 * CGGallerySystem — Manages CG (Computer Graphics) gallery unlocks and state.
 * Handles: CG unlock tracking, serialization for save/load, gallery display data.
 *
 * CGs are defined per-character in CharacterData files and registered here.
 */

import type { CGData, CGGalleryCard } from './Types';
import type { TextureAsset } from 'meta/worlds';
import { nereiaNeutralTexture, kashaNeutralTexture, cgNereiaLoveEndTexture, cgNereiaReleaseEndTexture } from './Assets';

// === CG Registry: All CGs in the game ===
const CG_REGISTRY: CGData[] = [
  // Portrait CGs (unlocked on first encounter)
  {
    id: 'portrait_nereia',
    characterId: 'nereia',
    name: 'Nereia',
    description: 'First encounter with the midnight koi.',
    unlockCondition: 'Meet Nereia for the first time',
    thumbnailPath: 'sprites/nereia_neutral.png',
  },
  {
    id: 'portrait_kasha',
    characterId: 'kasha',
    name: 'Kasha',
    description: 'First encounter with the crimson veiltail.',
    unlockCondition: 'Meet Kasha for the first time',
    thumbnailPath: 'sprites/char_veiltail_neutral.png',
  },
  // Ending CGs (unlocked via catch sequences)
  {
    id: 'ending_nereia_reel',
    characterId: 'nereia',
    name: 'The Last Morning',
    description: 'The data ends here. The lake remembers.',
    unlockCondition: 'Choose "Reel" in Nereia\'s catch sequence',
    thumbnailPath: 'sprites/nereia_love_end.png',
  },
  {
    id: 'ending_nereia_release',
    characterId: 'nereia',
    name: 'The File Is Closed',
    description: 'The lake remembers. You will remember. It is more than enough.',
    unlockCondition: 'Choose Nereia\'s name in the catch sequence',
    thumbnailPath: 'sprites/nereia_release_end.png',
  },
];

// Map from old CG IDs to new IDs (backward compat)
const CG_ID_MIGRATION: Record<string, string> = {
  'nereia_love_end': 'ending_nereia_reel',
};

// Map from CG ID to TextureAsset for XAML image binding
export const CG_TEXTURE_MAP: Record<string, TextureAsset> = {
  'portrait_nereia': nereiaNeutralTexture,
  'portrait_kasha': kashaNeutralTexture,
  'ending_nereia_reel': cgNereiaLoveEndTexture,
  'ending_nereia_release': cgNereiaReleaseEndTexture,
};

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

  /** Unlock a portrait CG for a fish (called on first encounter). */
  unlockPortraitCG(fishId: string): boolean {
    const portraitId = `portrait_${fishId}`;
    return this.unlockCG(portraitId);
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

  /** Get gallery cards for XAML grid display */
  getGalleryCards(): CGGalleryCard[] {
    return CG_REGISTRY.map(cg => ({
      id: cg.id,
      name: cg.name,
      characterId: cg.characterId,
      isUnlocked: this.unlockedCGs.has(cg.id),
      thumbnailPath: cg.thumbnailPath,
    }));
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

  // === Gallery Text for Journal Display (fallback) ===

  /** Get formatted collection text for the journal Collection tab */
  getCollectionText(): string {
    const progress = this.getProgress();
    return `Collection (${progress.unlocked}/${progress.total})`;
  }

  // === Save/Load ===

  serialize(): string[] {
    return Array.from(this.unlockedCGs);
  }

  deserialize(data: string[]): void {
    this.unlockedCGs = new Set();
    if (!data) return;
    for (const id of data) {
      // Migrate old IDs to new IDs
      const migratedId = CG_ID_MIGRATION[id] ?? id;
      this.unlockedCGs.add(migratedId);
    }
    console.log(`[CGGallerySystem] Loaded ${this.unlockedCGs.size} unlocked CGs`);
  }
}
