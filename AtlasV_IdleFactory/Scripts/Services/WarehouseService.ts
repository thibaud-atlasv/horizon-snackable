import {
  Service, service, subscribe, OnServiceReadyEvent, ExecuteOn,
  EventService, NetworkingService, OnWorldUpdateEvent,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { Events } from '../Types';
import { UPGRADE_WAREHOUSE } from '../Defs/UpgradeDefs';
import { WAREHOUSE_BASE_CAPACITY } from '../Constants';
import { UpgradeRegistryService } from './UpgradeRegistryService';

// ---------------------------------------------------------------------------
// WarehouseService — product stock buffer between belt and trucks.
//
// Receives products via Events.ProductDelivered (fired by ConveyorService).
// Each product has a settle cooldown before it becomes available for truck
// pickup — this gives the warehouse visual time to animate the arrival.
// The UI (gauge) reflects total stock immediately.
//
// TruckService calls removeProducts() directly (injected — synchronous pickup).
//
// Fires WarehouseFull / WarehouseAvailable on state transitions so
// ConveyorService can pause/resume without polling.
// ---------------------------------------------------------------------------

const SETTLE_TIME = 0.5; // seconds before a product can be picked up by trucks

@service()
export class WarehouseService extends Service {
  private readonly _upgrade: UpgradeRegistryService = Service.inject(UpgradeRegistryService);

  // Each entry is the remaining settle cooldown (<=0 means available for pickup).
  private _products: number[] = [];
  private _capacity: number   = WAREHOUSE_BASE_CAPACITY;
  private _wasFull:  boolean  = false;

  @subscribe(OnServiceReadyEvent, { execution: ExecuteOn.Owner })
  onReady(): void {
    this._products = [];
    this._capacity = WAREHOUSE_BASE_CAPACITY;
    this._wasFull  = false;
    this._upgrade.registerDef(UPGRADE_WAREHOUSE, 0);
  }

  /** Total stock (settling + available) — use for UI. */
  get stock():    number { return this._products.length; }
  get capacity(): number { return this._capacity; }

  isFull():  boolean { return this._products.length >= this._capacity; }
  isEmpty(): boolean { return this._products.length <= 0; }

  /** Number of products ready for truck pickup. */
  get availableStock(): number {
    let count = 0;
    for (const t of this._products) { if (t <= 0) count++; }
    return count;
  }

  /** Removes up to `count` settled products; returns the number actually removed. */
  removeProducts(count: number): number {
    let taken = 0;
    for (let i = this._products.length - 1; i >= 0 && taken < count; i--) {
      if (this._products[i] <= 0) {
        this._products.splice(i, 1);
        taken++;
      }
    }
    if (taken > 0) {
      EventService.sendLocally(Events.WarehouseProductRemoved, { count: taken });
      this._checkFullTransition();
    }
    return taken;
  }

  @subscribe(Events.UpgradePurchased)
  onUpgradePurchased(p: Events.UpgradePurchasedPayload): void {
    if (p.moduleId !== UPGRADE_WAREHOUSE.id) return;
    this._capacity = UPGRADE_WAREHOUSE.getEffect(p.level);
    this._checkFullTransition();
    if (p.level < UPGRADE_WAREHOUSE.maxLevel) {
      this._upgrade.registerDef(UPGRADE_WAREHOUSE, p.level);
    } else {
      this._upgrade.remove(UPGRADE_WAREHOUSE.id);
    }
  }

  @subscribe(Events.ProductDelivered, { execution: ExecuteOn.Owner })
  onProductDelivered(_p: Events.ProductDeliveredPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this.isFull()) return;

    this._products.push(SETTLE_TIME);
    EventService.sendLocally(Events.WarehouseProductAdded, {});
    this._checkFullTransition();
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const dt = payload.deltaTime;
    for (let i = 0; i < this._products.length; i++) {
      if (this._products[i] > 0) this._products[i] -= dt;
    }
  }

  private _checkFullTransition(): void {
    if (NetworkingService.get().isServerContext()) return;

    EventService.sendLocally(Events.WarehouseChanged, {
      stock: this._products.length,
      capacity: this._capacity,
    });

    const full = this.isFull();
    if (full && !this._wasFull) {
      this._wasFull = true;
      EventService.sendLocally(Events.WarehouseFull, {});
    } else if (!full && this._wasFull) {
      this._wasFull = false;
      EventService.sendLocally(Events.WarehouseAvailable, {});
    }
  }
}
