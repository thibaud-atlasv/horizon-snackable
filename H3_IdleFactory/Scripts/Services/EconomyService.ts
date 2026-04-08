import { Service, service, subscribe, OnServiceReadyEvent, EventService } from 'meta/worlds';
import { Events } from '../Types';
import { STARTING_MONEY } from '../Constants';

// ---------------------------------------------------------------------------
// EconomyService — owns the player's money balance and upgrade levels.
// Other services call addMoney() or trySpend() directly (injected dependency).
// ---------------------------------------------------------------------------
@service()
export class EconomyService extends Service {
  private _money: number = 0;
  private _upgradeLevels: Map<string, number> = new Map();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    this._money = STARTING_MONEY;
    // Initialize upgrade levels to 0
    this._upgradeLevels.set('conveyor', 0);
    this._upgradeLevels.set('warehouse', 0);
    this._upgradeLevels.set('trucks', 0);
    this._upgradeLevels.set('production0', 0);
    this._upgradeLevels.set('production1', 0);
    this._upgradeLevels.set('production2', 0);
  }

  get money(): number { return this._money; }

  addMoney(amount: number): void {
    this._money += amount;
  }

  /** Returns true and deducts amount if affordable; false otherwise. */
  trySpend(amount: number): boolean {
    if (this._money < amount) return false;
    this._money -= amount;
    return true;
  }

  getUpgradeLevel(moduleId: string): number {
    return this._upgradeLevels.get(moduleId) ?? 0;
  }

  tryUpgrade(moduleId: string, cost: number): boolean {
    if (!this.trySpend(cost)) return false;
    const newLevel = this.getUpgradeLevel(moduleId) + 1;
    this._upgradeLevels.set(moduleId, newLevel);
    EventService.sendLocally(Events.UpgradePurchased, { moduleId, level: newLevel });
    return true;
  }

  @subscribe(Events.TruckDelivered)
  onTruckDelivered(p: Events.TruckDeliveredPayload): void {
    this.addMoney(p.revenue);
  }
}
