/**
 * SYS-01-AFFECTION: Per-fish hidden affection meter.
 *
 * Single linear meter per character — no tiers, no floor locks.
 * Two thresholds matter:
 *   - Catch trigger: usually set via flag (`<id>.catch_available`) by the
 *     dialogue itself, then resolved by the catch sequence flow.
 *   - Drift-away threshold: when affection drops to or below this value,
 *     the character is treated as having abandoned the player and the
 *     drift-away ending fires.
 *
 * Rules:
 *   - Single action delta capped to ±30
 *   - Value clamped to [0, ceiling] (default ceiling = AFFECTION_MAX)
 */

import { AFFECTION_MAX, AFFECTION_DRIFT_AWAY_THRESHOLD } from './Constants';
import { DriftState } from './Types';
import type { FishAffection } from './Types';

// === Drift → Affection Modifier Table ===
const DRIFT_AFFECTION_MODIFIERS: Partial<Record<DriftState, number>> = {
  [DriftState.Warm]: 3,
  [DriftState.Troubled]: 0,
  [DriftState.Wary]: -2,
  [DriftState.Charmed]: 5,
  [DriftState.Angry]: -5,
  // Scared: fish doesn't appear, no modifier
};

// === Max affection delta per single action ===
const MAX_DELTA_PER_ACTION = 30;

export class AffectionSystem {
  /**
   * Apply an affection delta to a FishAffection record.
   * Enforces: ±30 cap, ceiling, absolute minimum 0.
   * Returns the actual delta applied.
   */
  applyDelta(affection: FishAffection, rawDelta: number, sessionId: string): number {
    const cappedDelta = Math.max(-MAX_DELTA_PER_ACTION, Math.min(MAX_DELTA_PER_ACTION, rawDelta));

    const oldValue = affection.value;
    let newValue = oldValue + cappedDelta;

    // Clamp to [drift-away threshold, ceiling]. Affection can go negative but
    // bottoms out at the threshold, where shouldDriftAway() will fire.
    newValue = Math.min(affection.ceiling, newValue);
    newValue = Math.max(AFFECTION_DRIFT_AWAY_THRESHOLD, newValue);

    affection.value = newValue;
    affection.lastChangeDelta = newValue - oldValue;
    affection.lastChangeSessionId = sessionId;

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

  /** True when affection has dropped to the drift-away threshold (character leaves). */
  shouldDriftAway(affection: FishAffection): boolean {
    return affection.value <= AFFECTION_DRIFT_AWAY_THRESHOLD;
  }

  /** Create a fresh FishAffection record for a new character. */
  createAffection(characterId: string): FishAffection {
    return {
      characterId,
      value: 0,
      ceiling: AFFECTION_MAX,
      lastChangeSessionId: '',
      lastChangeDelta: 0,
      peakValue: 0,
    };
  }

  /** Restore a FishAffection record from save data, filling in defaults for missing fields. */
  restoreFromSave(characterId: string, saved: Partial<FishAffection>): FishAffection {
    const fresh = this.createAffection(characterId);
    return {
      ...fresh,
      ...saved,
      characterId, // always use the key, not saved value
    };
  }
}
