/**
 * GeneratorService — Generator counts, buy actions, upgrades, and production cycles.
 *
 * Each generator has 10 upgrade milestones generated automatically from a few
 * parameters defined in its IGeneratorDef. No manual UPGRADE_DEFS array needed.
 *
 * Unlock chain: generator N becomes visible once the player owns at least
 * the count specified in ActionDefs unlock conditions. The first generator (id 0)
 * appears when affordable.
 *
 * Upgrade formulas (rank = 0-based milestone index):
 *   cost(rank)       = upgradeCostBase × upgradeCostScale ^ rank
 *   multiplier(rank) = upgradeMultiplierBase × upgradeMultiplierScale ^ rank
 *
 * The output multiplier for a generator is the product of all purchased milestone
 * multipliers, compounded: buying rank 0 (×2) then rank 1 (×3) yields ×6 total.
 */
import { OnServiceReadyEvent, Service, service, subscribe } from 'meta/worlds';
import { Events, GainSource } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';
import { StatsService } from './StatsService';
import { type IGeneratorDef, GENERATOR_DEFS } from '../Defs/GeneratorDefs';
import { getActionDef, getScaledCost } from '../Defs/ActionDefs';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@service()
export class GeneratorService extends Service {

  private readonly _resources = Service.injectWeak(ResourceService);

  /** How many of each generator the player owns. */
  private _counts: Map<number, number> = new Map();

  /** Per-generator time accumulator (seconds since last cycle). */
  private _accumulators: Map<number, number> = new Map();

  /**
   * Tracks how many upgrade milestones have been *purchased* per generator.
   * Used by getOutputMultiplier() and the upgrade factories.
   */
  private _purchasedRanks: Map<number, number> = new Map();

  // ── Startup: declare all actions ──────────────────────────────────────────────

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    for (const def of GENERATOR_DEFS) {
      this._declareBuyAction(def);
      this._declareUpgradeActions(def);
    }
  }

  // ── Production cycle ──────────────────────────────────────────────────────────

  @subscribe(Events.Tick)
  onTick(p: Events.TickPayload): void {
    for (const def of GENERATOR_DEFS) {
      const count = this.getCount(def.id);
      if (count === 0) continue;

      const accum = (this._accumulators.get(def.id) ?? 0) + p.dt;
      if (accum < def.cycleTime) {
        this._accumulators.set(def.id, accum);
        continue;
      }
      this._accumulators.set(def.id, accum - def.cycleTime);

      const raw = count * def.baseOutput * this.getOutputMultiplier(def.id);
      this._resources?.addGain(raw, GainSource.Passive);
    }
  }

  // ── Action handling ───────────────────────────────────────────────────────────

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    // ── Buy a generator ────────────────────────────────────────────────────
    if (p.id.startsWith('generator.buy.')) {
      const genId = parseInt(p.id.split('.')[2], 10);
      if (isNaN(genId)) return;
      const cost = this.getNextCost(genId);
      if (!this._resources?.spend(cost)) return;
      this._addOne(genId);
      return;
    }

    // ── Buy an upgrade ─────────────────────────────────────────────────────
    if (p.id.startsWith('generator.upgrade.')) {
      const parts    = p.id.split('.');
      const genId    = parseInt(parts[2], 10);
      const rank     = parseInt(parts[3], 10);
      if (isNaN(genId) || isNaN(rank)) return;

      const nextRank = this._purchasedRanks.get(genId) ?? 0;
      if (rank !== nextRank) return;

      if (!ResourceService.get().buy(p.id)) return;
      this._purchasedRanks.set(genId, nextRank + 1);
      // StatsChanged fires inside buy() → refreshDeclared() removes old rank, reveals next
      // Final refresh ensures factories see the updated _purchasedRanks
      ActionService.get().refreshDeclared();
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  getCount(generatorId: number): number {
    return this._counts.get(generatorId) ?? 0;
  }

  getNextCost(generatorId: number): number {
    if (!GENERATOR_DEFS.some(d => d.id === generatorId)) return Infinity;
    return getScaledCost(`generator.buy.${generatorId}`, this.getCount(generatorId));
  }

  /**
   * Compounded product of all purchased upgrade multipliers for a generator.
   * Example: rank 0 (×2) + rank 1 (×3) → ×6 total.
   */
  getOutputMultiplier(generatorId: number): number {
    const def       = GENERATOR_DEFS.find(d => d.id === generatorId);
    const purchased = this._purchasedRanks.get(generatorId) ?? 0;
    if (!def || purchased === 0) return 1;
    return def.upgradeMultipliers
      .slice(0, purchased)
      .reduce((mult: number, m: number) => mult * m, 1);
  }

  /**
   * Returns the cycle progress (0-1) of the first owned generator.
   * Used for progress bar UI.
   */
  getFirstGeneratorCycleProgress(): { progress: number; hasGenerator: boolean } {
    for (const def of GENERATOR_DEFS) {
      const count = this.getCount(def.id);
      if (count > 0) {
        const accum = this._accumulators.get(def.id) ?? 0;
        return { progress: accum / def.cycleTime, hasGenerator: true };
      }
    }
    return { progress: 0, hasGenerator: false };
  }

  /** Returns the ActionDef of the next unpurchased upgrade for a generator, or undefined. */
  getNextUpgrade(generatorId: number): ReturnType<typeof getActionDef> | undefined {
    const nextRank = this._purchasedRanks.get(generatorId) ?? 0;
    const id = `generator.upgrade.${generatorId}.${nextRank}`;
    try { return getActionDef(id); } catch { return undefined; }
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _addOne(generatorId: number): void {
    this._counts.set(generatorId, this.getCount(generatorId) + 1);
    StatsService.get().increment(`generator.${generatorId}`);
    // StatsChanged → refreshDeclared() updates buy action detail + reveals next tier/upgrades
  }

  private _declareBuyAction(def: IGeneratorDef): void {
    const buyId     = `generator.buy.${def.id}`;
    const actionDef = getActionDef(buyId);
    ActionService.get().declare(buyId, () => {
      const owned = this.getCount(def.id);
      const cost  = this.getNextCost(def.id);
      return {
        label    : actionDef.label,
        detail   : `${actionDef.description} [${owned} -> ${owned + 1}]`,
        cost,
        isEnabled: ResourceService.get().canAfford(cost),
      };
    });
  }

  private _declareUpgradeActions(def: IGeneratorDef): void {
    for (let rank = 0; rank < def.upgradeMultipliers.length; rank++) {
      const upgradeId = `generator.upgrade.${def.id}.${rank}`;
      let upgDef: ReturnType<typeof getActionDef>;
      try { upgDef = getActionDef(upgradeId); } catch { break; }

      ActionService.get().declare(upgradeId, () => {
        const purchased   = this._purchasedRanks.get(def.id) ?? 0;
        const currentMult = parseFloat(this.getOutputMultiplier(def.id).toFixed(2));
        const rankMul     = def.upgradeMultipliers[purchased] ?? 1;
        const nextMult    = parseFloat((currentMult * rankMul).toFixed(2));
        return {
          label    : upgDef.label,
          detail   : `${upgDef.description} [x${currentMult} -> x${nextMult}]`,
          cost     : upgDef.cost,
          isEnabled: ResourceService.get().canAfford(upgDef.cost),
        };
      });
    }
  }
}
