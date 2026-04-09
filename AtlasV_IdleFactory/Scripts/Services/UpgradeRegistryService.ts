import { Service, service, subscribe, OnServiceReadyEvent, EventService } from 'meta/worlds';
import { Events, type IUpgradeDef, type IUpgradeEntry } from '../Types';
import { EconomyService } from './EconomyService';

// ---------------------------------------------------------------------------
// UpgradeRegistryService — passive broker for the upgrade panel.
//
// Each gameplay service registers its upgrade entry on init and re-registers
// after applying an upgrade (with updated cost/description) or removes it
// when max level is reached. The UI panel reads the registry to build its
// list and calls tryPurchase() on button click.
//
// The registry does NOT know about any gameplay service — it only knows
// EconomyService (for spending money) and fires UpgradePurchased.
// ---------------------------------------------------------------------------

@service()
export class UpgradeRegistryService extends Service {
  private readonly _economy: EconomyService = Service.inject(EconomyService);

  private _entries: Map<string, IUpgradeEntry> = new Map();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    this._entries = new Map();
  }

  // --- Public API (called by gameplay services) ------------------------------

  /** Register or update an upgrade entry. Fires UpgradeRegistryChanged. */
  register(entry: IUpgradeEntry): void {
    this._entries.set(entry.id, entry);
    EventService.sendLocally(Events.UpgradeRegistryChanged, {});
  }

  registerDef(entry: IUpgradeDef, level: number = 0): void {
    this.register({
      id: entry.id,
      label: entry.label,
      description: entry.effectLabel,
      cost: entry.getCost(level),
    });
  }


  /** Remove an entry (e.g. max level reached). Fires UpgradeRegistryChanged. */
  remove(id: string): void {
    if (this._entries.delete(id)) {
      EventService.sendLocally(Events.UpgradeRegistryChanged, {});
    }
  }

  /** All currently registered entries — use for UI rendering. */
  getEntries(): readonly IUpgradeEntry[] {
    return Array.from(this._entries.values());
  }

  // --- Public API (called by UI panel) --------------------------------------

  /** Attempt to purchase an upgrade. Returns true on success. */
  tryPurchase(id: string): boolean {
    const entry = this._entries.get(id);
    if (!entry) return false;
    const result = this._economy.tryUpgrade(id, entry.cost);
    return result;
  }
}
