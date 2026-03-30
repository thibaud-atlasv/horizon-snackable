/**
 * CritService — Rolls crit on every gain and manages its own upgrade chain.
 *
 * Self-registration: declares its unlock condition in onReady(), then registers
 * its actions in ActionService when FeatureUnlocked fires. Each action handles
 * its own spend and upgrades its internal state. When an action is maxed it
 * unregisters itself and optionally registers the next one.
 *
 * ── Modifier pipeline ────────────────────────────────────────────────────────
 *   apply() is called by ModifierService for every gain.
 *   No source exemptions — crit can trigger on any GainSource.
 */
import { EventService, Service, OnServiceReadyEvent, service, subscribe } from 'meta/worlds';
import { BASE_CRIT_CHANCE, BASE_CRIT_MULTIPLIER } from '../Constants';
import { Events } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';
import { ProgressionService } from './ProgressionService';

const FEATURE_ID = 'crit';

// Upgrade chain — processed in order, one visible at a time per stat track
const CHANCE_UPGRADES = [
  { id: 'crit.chance.1', label: 'Sharp Eye I',   detail: '+5% crit chance',  cost: 500  },
  { id: 'crit.chance.2', label: 'Sharp Eye II',  detail: '+5% crit chance',  cost: 1_500 },
  { id: 'crit.chance.3', label: 'Sharp Eye III', detail: '+5% crit chance',  cost: 4_000 },
] as const;

const MULT_UPGRADES = [
  { id: 'crit.mult.1', label: 'Critical Strike I',  detail: '+1× crit multiplier', cost: 1_000 },
  { id: 'crit.mult.2', label: 'Critical Strike II', detail: '+1× crit multiplier', cost: 3_500 },
  { id: 'crit.mult.3', label: 'Critical Strike III',detail: '+1× crit multiplier', cost: 9_000 },
] as const;

@service()
export class CritService extends Service {

  private _chance    : number = BASE_CRIT_CHANCE;
  private _multiplier: number = BASE_CRIT_MULTIPLIER;

  private _chanceIdx : number = 0;
  private _multIdx   : number = 0;
  private _gold      : number = 0;

  private readonly _resources = Service.injectWeak(ResourceService);

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    ProgressionService.get().register(FEATURE_ID, () => true);
    ResourceService.get().registerModifier((amount, source) => {
      if (Math.random() >= this._chance) return amount;
      const finalAmount = amount * this._multiplier;
      EventService.sendLocally(Events.CritTriggered, {
        rawAmount: amount, multiplier: this._multiplier, finalAmount, source,
      });
      return finalAmount;
    }, 10);
  }

  // ── Unlock ────────────────────────────────────────────────────────────────────

  @subscribe(Events.FeatureUnlocked)
  onFeatureUnlocked(p: Events.FeatureUnlockedPayload): void {
    if (p.featureId !== FEATURE_ID) return;
    this._registerCurrentUpgrades();
  }

  // ── Action handling ───────────────────────────────────────────────────────────

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (!p.id.startsWith('crit.')) return;

    const chanceUpgrade = CHANCE_UPGRADES[this._chanceIdx];
    if (chanceUpgrade && p.id === chanceUpgrade.id) {
      if (!this._resources?.spend(chanceUpgrade.cost)) return;
      this._chance += 0.05;
      ActionService.get().unregister(chanceUpgrade.id);
      this._chanceIdx++;
      this._registerCurrentUpgrades();
      return;
    }

    const multUpgrade = MULT_UPGRADES[this._multIdx];
    if (multUpgrade && p.id === multUpgrade.id) {
      if (!this._resources?.spend(multUpgrade.cost)) return;
      this._multiplier += 1;
      ActionService.get().unregister(multUpgrade.id);
      this._multIdx++;
      this._registerCurrentUpgrades();
    }
  }

  // ── Affordability refresh ─────────────────────────────────────────────────────

  @subscribe(Events.ResourceChanged)
  onResourceChanged(p: Events.ResourceChangedPayload): void {
    this._gold = p.amount;
    this._refreshEnabled();
  }

  // ── Public queries ────────────────────────────────────────────────────────────

  getChance()    : number { return this._chance; }
  getMultiplier(): number { return this._multiplier; }

  // ── Reset ─────────────────────────────────────────────────────────────────────

  @subscribe(Events.Restart)
  onRestart(): void {
    this._unregisterAll();
    this._chance     = BASE_CRIT_CHANCE;
    this._multiplier = BASE_CRIT_MULTIPLIER;
    this._chanceIdx  = 0;
    this._multIdx    = 0;
    this._gold       = 0;
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _registerCurrentUpgrades(): void {
    const chance = CHANCE_UPGRADES[this._chanceIdx];
    if (chance) {
      ActionService.get().register({
        id: chance.id, label: chance.label, detail: chance.detail,
        cost: chance.cost, isEnabled: this._gold >= chance.cost,
      });
    }
    const mult = MULT_UPGRADES[this._multIdx];
    if (mult) {
      ActionService.get().register({
        id: mult.id, label: mult.label, detail: mult.detail,
        cost: mult.cost, isEnabled: this._gold >= mult.cost,
      });
    }
  }

  private _refreshEnabled(): void {
    const chance = CHANCE_UPGRADES[this._chanceIdx];
    if (chance) ActionService.get().update(chance.id, { isEnabled: this._gold >= chance.cost });
    const mult = MULT_UPGRADES[this._multIdx];
    if (mult)   ActionService.get().update(mult.id,   { isEnabled: this._gold >= mult.cost });
  }

  private _unregisterAll(): void {
    for (const u of CHANCE_UPGRADES) ActionService.get().unregister(u.id);
    for (const u of MULT_UPGRADES)   ActionService.get().unregister(u.id);
  }
}
