/**
 * UpgradePanelComponent — Controller for the Upgrade Panel UI.
 *
 * Component Attachment: Scene Entity (the UpgradePanel entity with CustomUiComponent)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Not Networked
 *
 * Reads upgrade entries from UpgradeRegistryService, populates the
 * UpgradePanelViewModel with positioned items, handles click events,
 * and refreshes the list when the registry changes.
 */
import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  ExecuteOn,
  NetworkingService,
  CustomUiComponent,
  CameraService,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import {
  UpgradePanelViewModel,
  upgradeItemClickEvent,
  UpgradePanelItemClickPayload,
} from '../UI/UpgradePanelViewModel';
import { UpgradeRegistryService } from '../Services/UpgradeRegistryService';
import { EconomyService } from '../Services/EconomyService';
import { Events } from '../Types';

/** Vertical spacing between upgrade buttons (in UI pixels) */

const BUTTON_POSITION : Record<string, { x: number, y: number }> = {
  'conveyor': { x: 25, y: 1400 },
  'production0': { x: 700, y: 700 },
  'production1': { x: 700, y: 1000 },
  'production2': { x: 700, y: 1300 },
  'warehouse': { x: 700, y: 300 },
  'trucks': { x: 700, y: 40 },
};

@component()
export class UpgradePanelComponent extends Component {
  private viewModel = new UpgradePanelViewModel();
  private uiComponent: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    // Skip server context — this is client-only UI
    if (NetworkingService.get().isServerContext()) {
      return;
    }

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) {
      console.error('[UpgradePanelComponent] CustomUiComponent not found on entity');
      return;
    }

    // Connect ViewModel to UI
    this.uiComponent.dataContext = this.viewModel;

    // Initial population from registry
    this.refreshUpgradeList();

    console.log('[UpgradePanelComponent] Initialized');
  }

  /**
   * Refresh the upgrade list when registry entries change.
   * Fires on LocalEvent from UpgradeRegistryService.
   */
  @subscribe(Events.UpgradeRegistryChanged, { execution: ExecuteOn.Everywhere })
  onRegistryChanged(): void {
    if (NetworkingService.get().isServerContext()) return;
    this.refreshUpgradeList();
  }

  @subscribe(Events.TruckDelivered, { execution: ExecuteOn.Everywhere })
  onMoneyChanged(_p: Events.TruckDeliveredPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this.refreshUpgradeList();
  }

  /**
   * Handle upgrade button clicks from the XAML UI.
   * The payload.parameter contains the UpgradeId from CommandParameter.
   */
  @subscribe(upgradeItemClickEvent)
  onUpgradeItemClick(payload: UpgradePanelItemClickPayload): void {
    const upgradeId = payload.parameter;
    if (!upgradeId) {
      console.warn('[UpgradePanelComponent] Click with empty upgradeId');
      return;
    }

    console.log(`[UpgradePanelComponent] Upgrade clicked: ${upgradeId}`);

    const success = UpgradeRegistryService.get().tryPurchase(upgradeId);
    if (success) {
      console.log(`[UpgradePanelComponent] Purchase successful: ${upgradeId}`);
    } else {
      console.log(`[UpgradePanelComponent] Purchase failed: ${upgradeId}`);
    }

    // Refresh list to reflect updated costs / removed entries
    this.refreshUpgradeList();
  }

  /**
   * Clear and rebuild the upgrade item list from the registry,
   * assigning vertical positions to each item.
   */
  private refreshUpgradeList(): void {
    this.viewModel.clearUpgrades();
    const entries = UpgradeRegistryService.get().getEntries();
    for (let i = 0; i < entries.length; i++) {

      const pos = BUTTON_POSITION[entries[i].id];
      let x = 0;
      let y = 0;
      if (pos)
      {
        x = pos.x;
        y = pos.y;
      }
      const entry = entries[i];
      this.viewModel.addUpgrade(
        entry.id,
        entry.label,
        entry.description,
        `${entry.cost > 0 ? entry.cost : 'Free'}`,
        entry.cost <= EconomyService.get().money,
        x,
        y,
      );
    }
  }
}
