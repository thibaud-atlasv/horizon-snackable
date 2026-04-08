import {
  Service, service, subscribe, OnServiceReadyEvent,
  OnWorldUpdateEvent, ExecuteOn,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { PRODUCTION_MODULE_DEFS } from '../Defs/ProductionDefs';
import { UPGRADE_DEFS } from '../Defs/UpgradeDefs';
import { Events } from '../Types';
import { ConveyorService } from './ConveyorService';
import { UpgradeRegistryService } from './UpgradeRegistryService';

// ---------------------------------------------------------------------------
// ProductionService — drives all production modules.
//
// Modules start locked (level 0 = Infinity interval). The first upgrade
// unlocks a module and sets its production interval.
// ---------------------------------------------------------------------------

interface IModuleState {
  id:              string;   // matches UpgradeDefs id (e.g. 'production0')
  depositDistance: number;
  interval:        number;   // Infinity = locked
  timer:           number;
  blocked:         boolean;
}

@service()
export class ProductionService extends Service {
  private readonly _conveyor: ConveyorService = Service.inject(ConveyorService);
  private _upgrade :  UpgradeRegistryService = Service.inject(UpgradeRegistryService);

  private _modules: IModuleState[] = [];

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    this._modules = PRODUCTION_MODULE_DEFS.map((def, i) => {
      const upgradeId = `production${i}`;
      const upgradeDef = UPGRADE_DEFS.find(u => u.id === upgradeId);
      // Level 0 → getEffect(0) = Infinity (locked)
      const interval = upgradeDef ? upgradeDef.getEffect(0) : Infinity;
      if (upgradeDef)
        this._upgrade.registerDef(upgradeDef, 0);
      return {
        id:              upgradeId,
        depositDistance: def.depositDistance,
        interval,
        timer:           0,
        blocked:         false,
      };
    });
  }

  /** Read-only snapshot — use for rendering only. */
  getModules(): readonly IModuleState[] { return this._modules; }

  // --- Upgrade handling ------------------------------------------------------

  @subscribe(Events.UpgradePurchased)
  onUpgradePurchased(p: Events.UpgradePurchasedPayload): void {
    for (const mod of this._modules) {
      if (mod.id !== p.moduleId) continue;
      const upgradeDef = UPGRADE_DEFS.find(u => u.id === mod.id);
      if (!upgradeDef) return;
      mod.interval = upgradeDef.getEffect(p.level);
      mod.timer    = 0;
      mod.blocked  = false;
      if (p.level < upgradeDef.maxLevel) {
        this._upgrade.registerDef(upgradeDef, p.level);
      } else {
        this._upgrade.remove(mod.id);
      }
      return;
    }
  }

  // --- Timer update ----------------------------------------------------------

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    const dt = payload.deltaTime;
    for (const mod of this._modules) {
      // Skip locked modules (Infinity interval)
      if (!isFinite(mod.interval)) continue;

      if (mod.blocked) {
        if (this._conveyor.tryDeposit(mod.depositDistance)) {
          mod.blocked = false;
          mod.timer   = 0;
        }
        continue;
      }

      mod.timer += dt;
      if (mod.timer < mod.interval) continue;

      if (this._conveyor.tryDeposit(mod.depositDistance)) {
        mod.timer = 0;
      } else {
        mod.blocked = true;
      }
    }
  }
}
