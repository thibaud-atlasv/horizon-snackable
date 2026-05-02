/**
 * SYS-01-AFFECTION: Per-fish hidden affection meter.
 * Manages affection values, tier thresholds, floor/ceiling enforcement,
 * drift modifiers, and tier transition detection.
 *
 * Rules:
 * - Floor enforced: once floor > 0, value cannot drop below it
 * - Max +30 per action (single action cap)
 * - TIER_ONLY visibility (never expose raw numbers)
 * - Trigger unique feedback at each tier transition
 */

import {
  AFFECTION_TIER_1_MAX,
  AFFECTION_TIER_2_MAX,
  AFFECTION_TIER_3_MAX,
  AFFECTION_TIER_4_MAX,
  AFFECTION_MAX,
} from './Constants';
import { AffectionTier, DriftState, TIER_NAMES } from './Types';
import type { FishAffection, TierTransitionInfo } from './Types';

// === Drift → Affection Modifier Table ===
const DRIFT_AFFECTION_MODIFIERS: Partial<Record<DriftState, number>> = {
  [DriftState.Warm]: 3,
  [DriftState.Troubled]: 0,
  [DriftState.Wary]: -2,
  [DriftState.Charmed]: 5,
  [DriftState.Angry]: -5,
  // Scared: fish doesn't appear, no modifier
};

// === Mood Icons (legacy string references removed — now using sprite textures) ===

// === Max affection delta per single action ===
const MAX_DELTA_PER_ACTION = 30;

export class AffectionSystem {
  /**
   * Apply an affection delta to a FishAffection record.
   * Enforces: ±30 cap, floor, ceiling. Returns the clamped delta applied.
   */
  applyDelta(affection: FishAffection, rawDelta: number, sessionId: string): number {
    // Cap the delta to ±30
    const cappedDelta = Math.max(-MAX_DELTA_PER_ACTION, Math.min(MAX_DELTA_PER_ACTION, rawDelta));

    const oldValue = affection.value;
    let newValue = oldValue + cappedDelta;

    // Enforce ceiling
    newValue = Math.min(affection.ceiling, newValue);

    // Enforce floor
    newValue = Math.max(affection.floor, newValue);

    // Enforce absolute minimum of 0
    newValue = Math.max(0, newValue);

    affection.value = newValue;
    affection.lastChangeDelta = newValue - oldValue;
    affection.lastChangeSessionId = sessionId;

    // Update peak
    if (newValue > affection.peakValue) {
      affection.peakValue = newValue;
    }

    return affection.lastChangeDelta;
  }

  /**
   * Apply drift modifier to affection on Cast start.
   * Returns the delta applied (0 if drift has no effect).
   */
  applyDriftModifier(affection: FishAffection, drift: DriftState, sessionId: string): number {
    const modifier = DRIFT_AFFECTION_MODIFIERS[drift];
    if (modifier === undefined || modifier === 0) return 0;
    return this.applyDelta(affection, modifier, sessionId);
  }

  /**
   * Determine the tier for a given affection value.
   */
  getTierForValue(value: number): AffectionTier {
    if (value > AFFECTION_TIER_4_MAX) return AffectionTier.Bonded;
    if (value > AFFECTION_TIER_3_MAX) return AffectionTier.Trusting;
    if (value > AFFECTION_TIER_2_MAX) return AffectionTier.Familiar;
    if (value > AFFECTION_TIER_1_MAX) return AffectionTier.Curious;
    return AffectionTier.Unaware;
  }

  /**
   * Check if a tier transition occurred and return info if so.
   * Also updates the affection record's tier and floor.
   */
  checkTierTransition(affection: FishAffection): TierTransitionInfo | null {
    const newTier = this.getTierForValue(affection.value);
    if (newTier === affection.tier) return null;

    const oldTier = affection.tier;
    affection.tier = newTier;

    // When tier increases, set floor to the threshold of the new tier
    // so affection can never drop back below the tier boundary
    if (newTier > oldTier) {
      const newFloor = this.getFloorForTier(newTier);
      affection.floor = Math.max(affection.floor, newFloor);
    }

    return {
      characterId: affection.characterId,
      oldTier,
      newTier,
      oldTierName: TIER_NAMES[oldTier],
      newTierName: TIER_NAMES[newTier],
      isPromotion: newTier > oldTier,
    };
  }

  /**
   * Get visible state for TIER_ONLY display.
   * Never exposes raw numbers.
   */
  getVisibleState(affection: FishAffection): { tierName: string } {
    return {
      tierName: TIER_NAMES[affection.tier],
    };
  }

  /**
   * Get the mood tier number (1-5). Use getMoodIconTexture() from MoodIcons.ts for sprites.
   */
  getMoodTier(tier: AffectionTier): number {
    return tier;
  }

  /**
   * Create a fresh FishAffection record for a new character.
   */
  createAffection(characterId: string): FishAffection {
    return {
      characterId,
      value: 0,
      tier: AffectionTier.Unaware,
      floor: 0,
      ceiling: AFFECTION_MAX,
      lastChangeSessionId: '',
      lastChangeDelta: 0,
      peakValue: 0,
      visibilityMode: 'TIER_ONLY',
    };
  }

  /**
   * Restore a FishAffection record from save data, filling in defaults for missing fields.
   */
  restoreFromSave(characterId: string, saved: Partial<FishAffection>): FishAffection {
    const fresh = this.createAffection(characterId);
    return {
      ...fresh,
      ...saved,
      characterId, // Always use the key, not saved value
    };
  }

  // === Private Helpers ===

  private getFloorForTier(tier: AffectionTier): number {
    switch (tier) {
      case AffectionTier.Curious: return AFFECTION_TIER_1_MAX + 1; // 15
      case AffectionTier.Familiar: return AFFECTION_TIER_2_MAX + 1; // 35
      case AffectionTier.Trusting: return AFFECTION_TIER_3_MAX + 1; // 60
      case AffectionTier.Bonded: return AFFECTION_TIER_4_MAX + 1; // 85
      default: return 0;
    }
  }
}
