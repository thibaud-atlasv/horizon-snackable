import {
  Component, OnEntityStartEvent, NetworkingService,
  component, NetworkMode, subscribe,
  WorldService,
} from 'meta/worlds';
import { EconomyService } from '../Services/EconomyService';
import { WarehouseService } from '../Services/WarehouseService';
import { ConveyorService } from '../Services/ConveyorService';
import { TruckService } from '../Services/TruckService';
import { ProductionService } from '../Services/ProductionService';
import { ProductPoolService } from '../Services/ProductPoolService';
import { UpgradeRegistryService } from '../Services/UpgradeRegistryService';
import { Assets } from '../Assets';
import { CONVEYOR_SLOT_COUNT, MAX_STORAGE } from '../Constants';

// ---------------------------------------------------------------------------
// GameManager — scene anchor for the idle factory game.
// Calls .get() on every service to guarantee instantiation.
// ---------------------------------------------------------------------------
@component()
export class GameManager extends Component {
  private _networkingService = NetworkingService.get();

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (this._networkingService.isServerContext()) return;
    UpgradeRegistryService.get();
    EconomyService.get();
    WarehouseService.get();
    ConveyorService.get();
    TruckService.get();
    ProductionService.get();
    ProductPoolService.get().spawnPool(CONVEYOR_SLOT_COUNT + MAX_STORAGE).catch(e => console.error(e));

    WorldService.get().spawnTemplate({
      templateAsset: Assets.Layout,
      networkMode: NetworkMode.LocalOnly,
    }).catch(e => console.error(e));
  }
}
