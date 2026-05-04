/**
 * SYS-23-GIFTS: Lure Inventory & Equipment System
 * Manages: owned lures, equipped lure (persists across casts), observed reactions per lure-fish pair.
 * Integrates with LureData for definitions and attraction resolution.
 */

import { DriftState, ExpressionState } from './Types';
import type { LureReaction, LureSaveData } from './Types';
import { ALL_LURES, STARTING_LURES, resolveFishForLure, getInitialDrift } from './LureData';

export class LureSystem {
  private ownedLures: string[] = [...STARTING_LURES];
  private equippedLureId: string | null = null; // No default — player must equip
  private reactions: LureReaction[] = [];

  // === Inventory Management ===

  /** Get all owned lure IDs */
  getOwnedLures(): string[] {
    return this.ownedLures;
  }

  /** Get the currently equipped lure ID (null if none) */
  getEquippedLure(): string | null {
    return this.equippedLureId;
  }

  /** Check if any lure is currently equipped */
  isLureEquipped(): boolean {
    return this.equippedLureId !== null;
  }

  /** Equip a lure (persists across casts). Returns false if not owned. */
  equipLure(lureId: string): boolean {
    if (!this.ownedLures.includes(lureId)) {
      console.log(`[LureSystem] Cannot equip unowned lure: ${lureId}`);
      return false;
    }
    this.equippedLureId = lureId;
    console.log(`[LureSystem] Equipped lure: ${lureId}`);
    return true;
  }

  /** Unequip current lure */
  unequipLure(): void {
    this.equippedLureId = null;
    console.log('[LureSystem] Unequipped lure');
  }

  /** Add a lure to inventory (e.g., from a gift) */
  addLure(lureId: string): boolean {
    if (this.ownedLures.includes(lureId)) {
      console.log(`[LureSystem] Already own lure: ${lureId}`);
      return false;
    }
    if (!ALL_LURES[lureId]) {
      console.log(`[LureSystem] Unknown lure ID: ${lureId}`);
      return false;
    }
    this.ownedLures.push(lureId);
    console.log(`[LureSystem] Added lure: ${lureId}`);
    return true;
  }

  /** Check if player owns a specific lure */
  ownsLure(lureId: string): boolean {
    return this.ownedLures.includes(lureId);
  }

  // === Cast Resolution ===

  /**
   * Resolve which fish appears based on the equipped lure.
   * Called at the start of a Cast. Requires lure to be equipped.
   */
  resolveFish(availableFish: string[]): string {
    if (!this.equippedLureId) {
      console.log('[LureSystem] No lure equipped, using first available fish');
      return availableFish[0] || 'nereia';
    }
    return resolveFishForLure(this.equippedLureId, availableFish);
  }

  /**
   * Get the initial drift state for the resolved fish with the equipped lure.
   */
  getInitialDriftForFish(fishId: string): DriftState {
    if (!this.equippedLureId) return DriftState.None;
    return getInitialDrift(this.equippedLureId, fishId);
  }

  // === Reaction Tracking ===

  /**
   * Record a lure-fish reaction observation.
   * Called after a Cast completes.
   */
  recordReaction(fishId: string, lastExpression: ExpressionState, wasPositive: boolean): void {
    if (!this.equippedLureId) return;

    let reaction = this.reactions.find(
      r => r.lureId === this.equippedLureId && r.fishId === fishId
    );

    if (!reaction) {
      reaction = {
        lureId: this.equippedLureId,
        fishId,
        castCount: 0,
        lastExpression: ExpressionState.Neutral,
        positiveActions: 0,
        negativeActions: 0,
      };
      this.reactions.push(reaction);
    }

    reaction.castCount++;
    reaction.lastExpression = lastExpression;
    if (wasPositive) {
      reaction.positiveActions++;
    } else {
      reaction.negativeActions++;
    }
  }

  /** Get all recorded reactions (for Journal Lure Box display) */
  getReactions(): LureReaction[] {
    return this.reactions;
  }

  // === Display Helpers ===

  /**
   * Get lure display info for the inventory UI.
   * Returns array of { id, name, description, isEquipped }
   */
  getLureDisplayList(): Array<{ id: string; name: string; description: string; isEquipped: boolean }> {
    return this.ownedLures.map(id => {
      const def = ALL_LURES[id];
      return {
        id,
        name: def?.name ?? id,
        description: def?.description ?? '',
        isEquipped: id === this.equippedLureId,
      };
    });
  }

  /** Get the equipped lure's display name (or "None") */
  getEquippedLureName(): string {
    if (!this.equippedLureId) return 'None';
    const def = ALL_LURES[this.equippedLureId];
    return def?.name ?? this.equippedLureId;
  }

  /** Get the equipped lure's description (or empty) */
  getEquippedLureDescription(): string {
    if (!this.equippedLureId) return '';
    const def = ALL_LURES[this.equippedLureId];
    return def?.description ?? '';
  }

  // === Save/Load ===

  serialize(): LureSaveData {
    return {
      owned: [...this.ownedLures],
      equippedLureId: this.equippedLureId,
      reactions: this.reactions.map(r => ({ ...r })),
    };
  }

  deserialize(data: LureSaveData): void {
    this.ownedLures = data.owned?.length > 0 ? [...data.owned] : [...STARTING_LURES];

    // Backward compat: read old `selected` field if `equippedLureId` is not present
    if (data.equippedLureId !== undefined) {
      this.equippedLureId = data.equippedLureId;
    } else if (data.selected) {
      // Old save format: treat `selected` as equipped
      this.equippedLureId = data.selected;
    } else {
      this.equippedLureId = null;
    }

    this.reactions = data.reactions ? data.reactions.map(r => ({ ...r })) : [];

    // Ensure equipped lure is valid (if set)
    if (this.equippedLureId && !this.ownedLures.includes(this.equippedLureId)) {
      this.equippedLureId = null;
    }
  }
}
