/**
 * GeneratorService — Generator counts, buy actions, upgrades, and production cycles.
 *
 * Each generator type has an independent accumulator. When the accumulator reaches
 * cycleTime, it produces baseOutput × count × upgradeMultiplier gold through the
 * modifier pipeline and resets.
 */
import { EventService, Service, service, subscribe } from 'meta/worlds';
import { Events, GainSource, type IGeneratorDef, type IUpgradeDef } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';

export const UPGRADE_DEFS: IUpgradeDef[] = [
  // ── Generator upgrades ────────────────────────────────────────────────────────
  {
    id: 1,
    name: 'Faster Cursors',
    description: 'Cursors are twice as efficient.',
    cost: 500,
    multiplier: 2,
    targetGeneratorId: 0, // Cursor
    unlockCondition: { generatorId: 0, count: 10 },
  },
  {
    id: 2,
    name: 'Fertilizer',
    description: 'Farms produce twice as much gold.',
    cost: 2500,
    multiplier: 2,
    targetGeneratorId: 1, // Farm
    unlockCondition: { generatorId: 1, count: 10 },
  },
  // Add more upgrades here. Convention: unlock at 10, 25, 50, 100, 150, 200 owned.
];

export const GENERATOR_DEFS: IGeneratorDef[] = [
  // ── Tier 1 ───────────────────────────────────────────────────────────────────
  {
    id: 0,
    name: 'Cursor',
    description: 'Automatically clicks for you.',
    baseCost: 15,
    costMultiplier: 1.15,
    baseOutput: 0.1,     // 0.1 gold/cycle → 0.1 gold/sec effective
    cycleTime: 1,
    unlockAt: 0,
  },
  {
    id: 1,
    name: 'Farm',
    description: 'Grows gold-bearing crops.',
    baseCost: 100,
    costMultiplier: 1.15,
    baseOutput: 2.5,     // 2.5 gold/cycle → 0.5 gold/sec effective
    cycleTime: 5,
    unlockAt: 10,
  },
  {
    id: 2,
    name: 'Mine',
    description: 'Extracts gold from deep underground.',
    baseCost: 1100,
    costMultiplier: 1.15,
    baseOutput: 40,      // 40 gold/cycle → 4 gold/sec effective
    cycleTime: 10,
    unlockAt: 100,
  },
  // Add more generators here following the same pattern.
  // Costs should roughly follow a ×10 progression per tier.
];

const GENERATOR_UPGRADES = UPGRADE_DEFS.filter(u => u.targetGeneratorId !== undefined);

@service()
export class GeneratorService extends Service {

  private readonly _resources = Service.injectWeak(ResourceService);

  private _counts           : Map<number, number> = new Map();
  private _accumulators     : Map<number, number> = new Map();
  private _purchasedUpgrades: Set<number>          = new Set();
  private _featureUnlocked  : boolean              = false;
  private _gold             : number               = 0;

  // ── Unlock ────────────────────────────────────────────────────────────────────

  @subscribe(Events.FeatureUnlocked)
  onFeatureUnlocked(p: Events.FeatureUnlockedPayload): void {
    if (p.featureId !== 'generators') return;
    this._featureUnlocked = true;
    this._refreshActions();
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

      const raw    = count * def.baseOutput * this.getOutputMultiplier(def.id);
      this._resources?.addGain(raw, GainSource.Passive);
    }
  }

  // ── Action refresh ────────────────────────────────────────────────────────────

  @subscribe(Events.ResourceChanged)
  onResourceChanged(p: Events.ResourceChangedPayload): void {
    this._gold = p.amount;
    if (this._featureUnlocked) this._refreshActions();
    this._refreshUpgradeActions();
  }

  // ── Action handling ───────────────────────────────────────────────────────────

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (p.id.startsWith('generator.buy.')) {
      const genId = parseInt(p.id.split('.')[2], 10);
      if (isNaN(genId)) return;
      const cost = this.getNextCost(genId);
      if (!this._resources?.spend(cost)) return;
      this._addOne(genId);
      return;
    }

    if (p.id.startsWith('generator.upgrade.')) {
      const upgradeId = parseInt(p.id.split('.')[2], 10);
      const def = GENERATOR_UPGRADES.find(u => u.id === upgradeId);
      if (!def || this._purchasedUpgrades.has(upgradeId)) return;
      if (!this._resources?.spend(def.cost)) return;
      this._purchasedUpgrades.add(upgradeId);
      ActionService.get().unregister(p.id);
      EventService.sendLocally(Events.UpgradePurchased, { upgradeId });
      this._refreshUpgradeActions();
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  getCount(generatorId: number): number {
    return this._counts.get(generatorId) ?? 0;
  }

  getNextCost(generatorId: number): number {
    const def = GENERATOR_DEFS.find(d => d.id === generatorId);
    if (!def) return Infinity;
    return Math.floor(def.baseCost * Math.pow(def.costMultiplier, this.getCount(generatorId)));
  }

  getOutputMultiplier(generatorId: number): number {
    return GENERATOR_UPGRADES
      .filter(u => u.targetGeneratorId === generatorId && this._purchasedUpgrades.has(u.id))
      .reduce((mult, u) => mult * u.multiplier, 1);
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────

  @subscribe(Events.Restart)
  onRestart(): void {
    for (const def of GENERATOR_DEFS)    ActionService.get().unregister(`generator.buy.${def.id}`);
    for (const def of GENERATOR_UPGRADES) ActionService.get().unregister(`generator.upgrade.${def.id}`);
    this._counts.clear();
    this._accumulators.clear();
    this._purchasedUpgrades.clear();
    this._featureUnlocked = false;
    this._gold            = 0;
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _addOne(generatorId: number): void {
    const newCount = this.getCount(generatorId) + 1;
    this._counts.set(generatorId, newCount);
    EventService.sendLocally(Events.GeneratorChanged, {
      generatorId,
      newCount,
      nextCost: this.getNextCost(generatorId),
    });
    this._refreshActions();
    this._refreshUpgradeActions();
  }

  private _refreshActions(): void {
    for (const def of GENERATOR_DEFS) {
      const id      = `generator.buy.${def.id}`;
      const cost    = this.getNextCost(def.id);
      const owned   = this.getCount(def.id);
      const visible = this._gold >= def.unlockAt || owned > 0;

      if (!visible) continue;

      const action = {
        id,
        label    : `Buy ${def.name}`,
        detail   : `${def.description} [${owned} owned]`,
        cost,
        isEnabled: this._gold >= cost,
      };

      if (ActionService.get().getAll().some(a => a.id === id)) {
        ActionService.get().update(id, { detail: action.detail, cost, isEnabled: action.isEnabled });
      } else {
        ActionService.get().register(action);
      }
    }
  }

  private _refreshUpgradeActions(): void {
    for (const def of GENERATOR_UPGRADES) {
      if (this._purchasedUpgrades.has(def.id)) continue;
      const id      = `generator.upgrade.${def.id}`;
      const visible = this._isUpgradeUnlocked(def);
      const already = ActionService.get().getAll().some(a => a.id === id);

      if (visible && !already) {
        ActionService.get().register({
          id,
          label    : def.name,
          detail   : def.description,
          cost     : def.cost,
          isEnabled: this._gold >= def.cost,
        });
      } else if (visible && already) {
        ActionService.get().update(id, { isEnabled: this._gold >= def.cost });
      }
    }
  }

  private _isUpgradeUnlocked(def: (typeof GENERATOR_UPGRADES)[0]): boolean {
    const cond = def.unlockCondition;
    if ('generatorId' in cond) return (this._counts.get(cond.generatorId) ?? 0) >= cond.count;
    return false;
  }
}
