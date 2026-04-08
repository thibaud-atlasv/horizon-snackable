import {
  Service, service, subscribe, OnServiceReadyEvent, EventService,
  OnWorldUpdateEvent, ExecuteOn,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { Events } from '../Types';
import { UPGRADE_CONVEYOR } from '../Defs/UpgradeDefs';
import { CONVEYOR_BELT_LENGTH, CONVEYOR_BASE_SPEED, CONVEYOR_MIN_GAP } from '../Constants';
import { UpgradeRegistryService } from './UpgradeRegistryService';

// ---------------------------------------------------------------------------
// ConveyorService — continuous belt.
//
// Products are floats in a sorted array: distance goes from beltLength
// (production end) toward 0 (warehouse end). Every frame all products
// advance by dt * speed. When a product reaches distance <= 0 it is
// delivered (fires ProductDelivered).
//
// ProductionService calls tryDeposit(distance) — succeeds only when there
// is enough gap around the requested position.
//
// Belt pauses/resumes via WarehouseFull / WarehouseAvailable events.
// ---------------------------------------------------------------------------

export interface IBeltProduct {
  distance: number;
  delivering: boolean; // shrinking at warehouse end
  shrinkTimer: number;
}

const SHRINK_DURATION = 0.3;

@service()
export class ConveyorService extends Service {
  private _products: IBeltProduct[] = [];
  private _speed: number = CONVEYOR_BASE_SPEED;
  private _paused: boolean = false;
  private _upgrade :  UpgradeRegistryService = Service.inject(UpgradeRegistryService);

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    this._products = [];
    this._speed = CONVEYOR_BASE_SPEED;
    this._paused = false;
    this._upgrade.registerDef(UPGRADE_CONVEYOR, 0);
  }

  // --- Public API -----------------------------------------------------------

  /** Try to place a product at `distance` on the belt. Returns true on success. */
  tryDeposit(distance: number): boolean {
    if (distance < 0 || distance > CONVEYOR_BELT_LENGTH) return false;

    // Check gap with all existing products
    for (const p of this._products) {
      if (Math.abs(p.distance - distance) < CONVEYOR_MIN_GAP) return false;
    }

    this._products.push({ distance, delivering: false, shrinkTimer: 0 });
    // Keep sorted by distance descending (farthest first) for iteration order
    this._products.sort((a, b) => b.distance - a.distance);
    return true;
  }

  isPaused(): boolean { return this._paused; }
  getSpeed(): number { return this._speed; }
  getBeltLength(): number { return CONVEYOR_BELT_LENGTH; }

  /** Read-only snapshot of all products — use for rendering. */
  getProducts(): readonly IBeltProduct[] { return this._products; }

  // --- Upgrades -------------------------------------------------------------

  @subscribe(Events.UpgradePurchased)
  onUpgradePurchased(p: Events.UpgradePurchasedPayload): void {
    if (p.moduleId !== UPGRADE_CONVEYOR.id) return;
    this._speed = UPGRADE_CONVEYOR.getEffect(p.level);
    if (p.level < UPGRADE_CONVEYOR.maxLevel) {
      this._upgrade.registerDef(UPGRADE_CONVEYOR, p.level);
    } else {
      this._upgrade.remove(UPGRADE_CONVEYOR.id);
    }
  }

  // --- Warehouse state ------------------------------------------------------

  @subscribe(Events.WarehouseFull)
  onWarehouseFull(_p: Events.WarehouseFullPayload): void {
    this._paused = true;
  }

  @subscribe(Events.WarehouseAvailable)
  onWarehouseAvailable(_p: Events.WarehouseAvailablePayload): void {
    this._paused = false;
  }

  // --- Update loop ----------------------------------------------------------

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    const dt = payload.deltaTime;

    // Advance shrink timers even when paused (animation should complete)
    for (let i = this._products.length - 1; i >= 0; i--) {
      const p = this._products[i];
      if (!p.delivering) continue;

      p.shrinkTimer += dt;
      if (p.shrinkTimer >= SHRINK_DURATION) {
        this._products.splice(i, 1);
      }
    }

    if (this._paused) return;

    const advance = dt * this._speed;

    for (const p of this._products) {
      if (p.delivering) continue;
      p.distance -= advance;

      if (p.distance <= 0) {
        p.distance = 0;
        p.delivering = true;
        p.shrinkTimer = 0;
        EventService.sendLocally(Events.ProductDelivered, {});
      }
    }
  }
}
