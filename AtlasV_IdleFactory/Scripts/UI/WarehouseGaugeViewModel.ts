import {
  UiViewModel,
  uiViewModel,
  Component,
  component,
  CustomUiComponent,
  subscribe,
  OnEntityStartEvent,
  ExecuteOn,
  NetworkingService,
} from 'meta/worlds';
import { Events } from '../Types';

/**
 * ViewModel for the Warehouse Gauge UI.
 * Displays stock/capacity as text and controls progress bar fill width.
 */
@uiViewModel()
export class WarehouseGaugeViewModel extends UiViewModel {
  /** Text displayed in format "stock/capacity" (e.g., "3/6") */
  public displayText: string = '0/0';

  /** Width of the progress fill in pixels (max ~180 for inner area) */
  public fillWidth: number = 0;
}

/**
 * Component that controls the Warehouse Gauge UI.
 * Subscribes to WarehouseChanged events and updates the ViewModel.
 *
 * Component Attachment: Scene Entity (world-space UI entity in Warehouse template)
 * Component Networking: Local
 * Component Ownership: Not Networked (client-only display)
 */
@component()
export class WarehouseGaugeController extends Component {
  private viewModel = new WarehouseGaugeViewModel();
  private networkingService = NetworkingService.get();

  /** Maximum fill width in pixels (accounting for border and margin) */
  private readonly maxFillWidth: number = 180;

  @subscribe(OnEntityStartEvent)
  onStart() {
    // Skip server context - this is client-only UI
    if (this.networkingService.isServerContext()) {
      return;
    }

    const uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!uiComponent) {
      console.error('WarehouseGaugeController: CustomUiComponent not found on entity');
      return;
    }

    // Connect ViewModel to UI
    uiComponent.dataContext = this.viewModel;
  }

  @subscribe(Events.WarehouseChanged, { execution: ExecuteOn.Everywhere })
  onWarehouseChanged(payload: Events.WarehouseChangedPayload) {
    // Skip server context - this is client-only UI
    if (this.networkingService.isServerContext()) {
      return;
    }

    const { stock, capacity } = payload;

    // Update display text in "stock/capacity" format
    this.viewModel.displayText = `${stock}/${capacity}`;

    // Calculate fill width based on ratio
    const ratio = capacity > 0 ? stock / capacity : 0;
    this.viewModel.fillWidth = Math.round(ratio * this.maxFillWidth);
  }
}
