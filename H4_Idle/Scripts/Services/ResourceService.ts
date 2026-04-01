/**
 * ResourceService — Gold database + gain modifier pipeline.
 *
 * All gold income goes through addGain() which applies registered modifiers
 * and fires GainApplied. Modifier functions are registered by feature services
 * (Crit, Frenzy, …) in their onReady(). ResourceService has no knowledge of
 * specific modifiers.
 */
import { EventService, Service, service } from 'meta/worlds';
import { Events, GainSource, ResourceType } from '../Types';
import { StatsService } from './StatsService';
import { getScaledCost } from '../Defs/ActionDefs';

type GainModifierResult = { amount: number; isCrit?: boolean; isFrenzy?: boolean };
type GainModifier = (amount: number, source: GainSource) => GainModifierResult;

@service()
export class ResourceService extends Service {

  private _gold     : number = 0;
  private _modifiers: Array<{ fn: GainModifier; priority: number }> = [];

  // ── Modifier registry ─────────────────────────────────────────────────────────

  registerModifier(fn: GainModifier, priority: number = 0): void {
    this._modifiers.push({ fn, priority });
    this._modifiers.sort((a, b) => b.priority - a.priority);
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /** Route a gain through the modifier pipeline, credit gold, and notify. */
  addGain(rawAmount: number, source: GainSource): void {
    let amount   = rawAmount;
    let isCrit   = false;
    let isFrenzy = false;
    for (const { fn } of this._modifiers) {
      const result = fn(amount, source);
      amount   = result.amount;
      if (result.isCrit)   isCrit   = true;
      if (result.isFrenzy) isFrenzy = true;
    }
    this._gold += amount;
    StatsService.get().increment('gold_earned', amount);
    EventService.sendLocally(Events.GainApplied, { amount, source, isCrit, isFrenzy });
    this._notify();
  }

  /** Deduct gold. Returns true on success, false if insufficient funds. */
  spend(amount: number): boolean {
    if (this._gold < amount) return false;
    this._gold -= amount;
    this._notify();
    return true;
  }

  canAfford(amount: number): boolean { return this._gold >= amount; }
  getGold()              : number    { return this._gold; }

  /**
   * Standard action purchase: spend scaled cost + track stat.
   * Covers all repeatable upgrades and one-time unlocks (level 0 → cost × pow⁰ = base cost).
   * Returns false if insufficient funds (no state change).
   */
  buy(actionId: string): boolean {
    const cost = getScaledCost(actionId);
    if (!this.spend(cost)) return false;
    StatsService.get().increment(actionId);
    return true;
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _notify(): void {
    EventService.sendLocally(Events.ResourceChanged, {
      type:   ResourceType.Gold,
      amount: this._gold,
    });
  }
}
