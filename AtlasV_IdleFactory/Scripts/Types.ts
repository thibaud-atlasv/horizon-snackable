import { LocalEvent } from 'meta/worlds';

export interface IUpgradeDef {
  id:          string;
  label:       string;
  effectLabel: string;
  maxLevel:    number;
  getCost(level: number):   number;
  getEffect(level: number): number;
}

export interface IUpgradeEntry {
  id:          string;
  label:       string;
  description: string;
  cost:        number;
}

// ---------------------------------------------------------------------------
// Events
//
// Only events that have at least one active subscriber are declared here.
// UI/HUD events are added when the UI layer is built.
// ---------------------------------------------------------------------------
export namespace Events {

  // Conveyor delivered a product to the warehouse (subscribed by WarehouseService)
  export class ProductDeliveredPayload {}
  export const ProductDelivered = new LocalEvent<ProductDeliveredPayload>(
    'EvProductDelivered', ProductDeliveredPayload,
  );

  // Warehouse reached full capacity (subscribed by ConveyorService)
  export class WarehouseFullPayload {}
  export const WarehouseFull = new LocalEvent<WarehouseFullPayload>(
    'EvWarehouseFull', WarehouseFullPayload,
  );

  // Warehouse has space available again (subscribed by ConveyorService)
  export class WarehouseAvailablePayload {}
  export const WarehouseAvailable = new LocalEvent<WarehouseAvailablePayload>(
    'EvWarehouseAvailable', WarehouseAvailablePayload,
  );

  // Warehouse received a product (subscribed by WarehouseController for visuals)
  export class WarehouseProductAddedPayload {}
  export const WarehouseProductAdded = new LocalEvent<WarehouseProductAddedPayload>(
    'EvWarehouseProductAdded', WarehouseProductAddedPayload,
  );

  // Warehouse removed products (subscribed by WarehouseController for visuals)
  export class WarehouseProductRemovedPayload { count: number = 0; }
  export const WarehouseProductRemoved = new LocalEvent<WarehouseProductRemovedPayload>(
    'EvWarehouseProductRemoved', WarehouseProductRemovedPayload,
  );

  // Truck delivered products and earned money (subscribed by EconomyService)
  export class TruckDeliveredPayload { productCount: number = 0; revenue: number = 0; }
  export const TruckDelivered = new LocalEvent<TruckDeliveredPayload>(
    'EvTruckDelivered', TruckDeliveredPayload,
  );

  // Warehouse stock changed (used for UI updates)
  export class WarehouseChangedPayload { stock: number = 0; capacity: number = 0; }
  export const WarehouseChanged = new LocalEvent<WarehouseChangedPayload>(
    'EvWarehouseChanged', WarehouseChangedPayload,
  );

  // An upgrade was purchased (subscribed by various services to apply effects)
  export class UpgradePurchasedPayload { moduleId: string = ''; level: number = 0; }
  export const UpgradePurchased = new LocalEvent<UpgradePurchasedPayload>(
    'EvUpgradePurchased', UpgradePurchasedPayload,
  );

  // Upgrade registry changed — panel should refresh its list
  export class UpgradeRegistryChangedPayload {}
  export const UpgradeRegistryChanged = new LocalEvent<UpgradeRegistryChangedPayload>(
    'EvUpgradeRegistryChanged', UpgradeRegistryChangedPayload,
  );
}
