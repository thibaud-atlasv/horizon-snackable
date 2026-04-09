import {
  Service, service, subscribe, OnServiceReadyEvent, EventService,
  OnWorldUpdateEvent, ExecuteOn,
} from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { Events } from '../Types';
import {
  TRUCK_CAPACITY, TRUCK_BASE_COUNT, MONEY_PER_PRODUCT,
  TRUCK_SPEED, TRUCK_LOADING_DURATION,
  TRUCK_LOADING_X, TRUCK_OFFSCREEN_RIGHT_X, TRUCK_OFFSCREEN_LEFT_X,
} from '../Constants';
import { UPGRADE_TRUCKS } from '../Defs/UpgradeDefs';
import { WarehouseService } from './WarehouseService';
import { UpgradeRegistryService } from './UpgradeRegistryService';

// ---------------------------------------------------------------------------
// TruckService — simplified queue-based fleet.
//
// All trucks start stacked at the off-screen staging position.
// Truck 0 begins at the loading dock.
//
// Phase cycle:
//   Staged       → off-screen, waiting in line
//   Approaching  → moving from staging to dock (triggered when current truck starts Loading)
//   AtDock       → at dock, waiting for warehouse stock
//   Loading      → 1 s cargo-load pause; next truck starts Approaching here (Option A)
//   Away         → traveling right (delivers) then left back to staging
//
// Away encodes two sub-phases via travelOutEnd:
//   [0, travelOutEnd)      → heading to delivery (fires TruckDelivered at threshold)
//   [travelOutEnd, awayDuration) → crossing back to staging (empty)
// ---------------------------------------------------------------------------

export enum TruckPhase {
  Staged      = 0,
  Approaching = 1,
  AtDock      = 2,
  Loading     = 3,
  Away        = 4,
}

export interface ITruckData {
  readonly phase: TruckPhase;
  readonly timer: number;
  readonly load: number;
  readonly approachDuration: number; // Approaching: total travel time to dock
  readonly travelOutEnd: number;     // Away: timer threshold for delivery
  readonly awayDuration: number;     // Away: total duration (out + across)
}

interface ITruckMutable {
  phase: TruckPhase;
  timer: number;
  load: number;
  approachDuration: number;
  travelOutEnd: number;
  awayDuration: number;
  delivered: boolean;
}

@service()
export class TruckService extends Service {
  private readonly _warehouse: WarehouseService     = Service.inject(WarehouseService);
  private readonly _networking: NetworkingService    = Service.inject(NetworkingService);
  private readonly _upgrade:   UpgradeRegistryService = Service.inject(UpgradeRegistryService);

  private _trucks: ITruckMutable[] = [];
  private _stagedQueue: number[]   = []; // truck indices waiting to approach, in order

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    if (this._networking.isServerContext()) return;
    this._trucks      = [];
    this._stagedQueue = [];
    for (let i = 0; i < TRUCK_BASE_COUNT; i++) {
      this._trucks.push(this._makeTruck());
    }
    // Truck 0 starts at dock; the rest are staged off-screen
    this._trucks[0].phase = TruckPhase.AtDock;
    for (let i = 1; i < TRUCK_BASE_COUNT; i++) {
      this._stagedQueue.push(i);
    }
    this._upgrade.registerDef(UPGRADE_TRUCKS, 0);
  }

  /** Read-only snapshot for rendering. */
  getTrucks(): readonly ITruckData[] { return this._trucks; }

  // --- Upgrades -------------------------------------------------------------

  @subscribe(Events.UpgradePurchased)
  onUpgradePurchased(p: Events.UpgradePurchasedPayload): void {
    if (p.moduleId !== UPGRADE_TRUCKS.id) return;
    const targetCount = UPGRADE_TRUCKS.getEffect(p.level);
    while (this._trucks.length < targetCount) {
      const idx = this._trucks.length;
      this._trucks.push(this._makeTruck());
      this._stagedQueue.push(idx);
    }
    // Kick an approach if the dock is free and new trucks are staged
    if (!this._trucks.some(t => t.phase === TruckPhase.Approaching || t.phase === TruckPhase.AtDock)) {
      this._kickNextApproach();
    }
    if (p.level < UPGRADE_TRUCKS.maxLevel) {
      this._upgrade.registerDef(UPGRADE_TRUCKS, p.level);
    } else {
      this._upgrade.remove(UPGRADE_TRUCKS.id);
    }
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    const dt = payload.deltaTime;
    for (let i = 0; i < this._trucks.length; i++) {
      switch (this._trucks[i].phase) {
        case TruckPhase.AtDock:      this._updateAtDock(i);       break;
        case TruckPhase.Loading:     this._updateLoading(i, dt);  break;
        case TruckPhase.Approaching: this._updateApproach(i, dt); break;
        case TruckPhase.Away:        this._updateAway(i, dt);     break;
      }
    }
  }

  // ---------------------------------------------------------------------------

  private _updateAtDock(idx: number): void {
    if (this._warehouse.availableStock <= 0) return;
    const taken = this._warehouse.removeProducts(1);
    if (taken === 0) return;

    const truck  = this._trucks[idx];
    truck.load   = 1;
    truck.timer  = 0;
    truck.phase  = TruckPhase.Loading;
  }

  private _updateLoading(idx: number, dt: number): void {
    const truck = this._trucks[idx];
    truck.timer += dt;
    if (truck.timer < TRUCK_LOADING_DURATION) return;

    // Try to load one more product if not at capacity
    if (truck.load < TRUCK_CAPACITY && this._warehouse.availableStock > 0) {
      const taken = this._warehouse.removeProducts(1);
      if (taken > 0) {
        truck.load += taken;
        truck.timer = 0; // restart loading timer for the next product
        return;
      }
    }

    // Full or no more stock — depart
    const outDist    = Math.abs(TRUCK_OFFSCREEN_RIGHT_X - TRUCK_LOADING_X);
    const acrossDist = Math.abs(TRUCK_OFFSCREEN_LEFT_X  - TRUCK_OFFSCREEN_RIGHT_X);
    truck.travelOutEnd  = outDist    / TRUCK_SPEED;
    truck.awayDuration  = truck.travelOutEnd + acrossDist / TRUCK_SPEED;
    truck.delivered     = false;
    truck.timer         = 0;
    truck.phase         = TruckPhase.Away;

    // Next truck can start approaching now that the dock is free
    this._kickNextApproach();
  }

  private _updateApproach(idx: number, dt: number): void {
    const truck = this._trucks[idx];
    truck.timer += dt;
    if (truck.timer >= truck.approachDuration) {
      truck.timer = 0;
      truck.phase = TruckPhase.AtDock;
    }
  }

  private _updateAway(idx: number, dt: number): void {
    const truck = this._trucks[idx];
    truck.timer += dt;

    if (!truck.delivered && truck.timer >= truck.travelOutEnd) {
      truck.delivered = true;
      EventService.sendLocally(Events.TruckDelivered, {
        productCount: truck.load,
        revenue:      truck.load * MONEY_PER_PRODUCT,
      });
      truck.load = 0;
    }

    if (truck.timer >= truck.awayDuration) {
      truck.timer = 0;
      truck.phase = TruckPhase.Staged;
      this._stagedQueue.push(idx);
      // Kick next approach only if the dock is fully free
      if (!this._trucks.some(t => t.phase === TruckPhase.Approaching || t.phase === TruckPhase.AtDock || t.phase === TruckPhase.Loading)) {
        this._kickNextApproach();
      }
    }
  }

  private _kickNextApproach(): void {
    if (this._stagedQueue.length === 0) return;
    const nextIdx = this._stagedQueue.shift()!;
    const next    = this._trucks[nextIdx];
    next.approachDuration = Math.abs(TRUCK_LOADING_X - TRUCK_OFFSCREEN_LEFT_X) / TRUCK_SPEED;
    next.timer            = 0;
    next.phase            = TruckPhase.Approaching;
  }

  private _makeTruck(): ITruckMutable {
    return {
      phase: TruckPhase.Staged, timer: 0, load: 0,
      approachDuration: 0, travelOutEnd: 0, awayDuration: 0, delivered: false,
    };
  }
}
