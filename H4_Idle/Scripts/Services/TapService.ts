/**
 * TapService — Handles player tap input and tap/click upgrades.
 *
 * Applies the modifier pipeline (Crit, Frenzy) to each tap before crediting gold.
 * Owns all upgrades in UPGRADE_DEFS where targetGeneratorId is undefined.
 */
import { EventService, Service, service, subscribe } from 'meta/worlds';
import { BASE_CLICK_VALUE } from '../Constants';
import { Events, GainSource, type IUpgradeDef } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';


export const TAP_UPGRADES: IUpgradeDef[] = [
  // ── Click upgrades ────────────────────────────────────────────────────────────
  {
    id: 0,
    name: 'Reinforced Finger',
    description: 'Double the value of each tap.',
    cost: 100,
    multiplier: 2,
    unlockCondition: { resourceAmount: 50 },
  },
];

@service()
export class TapService extends Service {

  private readonly _resources = Service.injectWeak(ResourceService);

  private _purchased : Set<number> = new Set();
  private _multiplier: number      = 1;
  private _gold      : number      = 0;

  // ── Tap ───────────────────────────────────────────────────────────────────────

  @subscribe(Events.PlayerTap)
  onPlayerTap(): void {
    this._resources?.addGain(BASE_CLICK_VALUE * this._multiplier, GainSource.Tap);
  }

  // ── Action refresh ────────────────────────────────────────────────────────────

  @subscribe(Events.ResourceChanged)
  onResourceChanged(p: Events.ResourceChangedPayload): void {
    this._gold = p.amount;
    this._refreshActions();
  }

  // ── Action handling ───────────────────────────────────────────────────────────

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (!p.id.startsWith('upgrade.buy.')) return;
    const upgradeId = parseInt(p.id.split('.')[2], 10);
    const def = TAP_UPGRADES.find(u => u.id === upgradeId);
    if (!def || this._purchased.has(upgradeId)) return;
    if (!this._resources?.spend(def.cost)) return;
    this._purchased.add(upgradeId);
    this._multiplier *= def.multiplier;
    ActionService.get().unregister(p.id);
    EventService.sendLocally(Events.UpgradePurchased, { upgradeId });
    this._refreshActions();
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  getClickValue(): number { return BASE_CLICK_VALUE * this._multiplier; }

  // ── Reset ─────────────────────────────────────────────────────────────────────

  @subscribe(Events.Restart)
  onRestart(): void {
    for (const def of TAP_UPGRADES) ActionService.get().unregister(`upgrade.buy.${def.id}`);
    this._purchased.clear();
    this._multiplier = 1;
    this._gold       = 0;
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _refreshActions(): void {
    for (const def of TAP_UPGRADES) {
      if (this._purchased.has(def.id)) continue;
      const id      = `upgrade.buy.${def.id}`;
      const visible = 'resourceAmount' in def.unlockCondition
        ? this._gold >= def.unlockCondition.resourceAmount
        : false;
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
}
