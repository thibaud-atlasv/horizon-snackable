/**
 * ResourceService — Gold database + gain modifier pipeline.
 *
 * All gold income goes through addGain() which applies registered modifiers
 * and fires GainApplied. Modifier functions are registered by feature services
 * (Crit, Frenzy, …) in their onReady(). ResourceService has no knowledge of
 * specific modifiers.
 */
import { EventService, Service, service, subscribe } from 'meta/worlds';
import { Events, GainSource, ResourceType } from '../Types';

type GainModifier = (amount: number, source: GainSource) => number;

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
    const amount = this._modifiers.reduce((a, { fn }) => fn(a, source), rawAmount);
    this._gold += amount;
    EventService.sendLocally(Events.GainApplied, { amount, source });
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

  // ── Reset ─────────────────────────────────────────────────────────────────────

  @subscribe(Events.Restart)
  onRestart(): void {
    this._gold = 0;
    this._notify();
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _notify(): void {
    EventService.sendLocally(Events.ResourceChanged, {
      type:   ResourceType.Gold,
      amount: this._gold,
    });
  }
}
