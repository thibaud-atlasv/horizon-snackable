/**
 * PowerGaugeComponent — Drives the vertical power gauge UI.
 *
 * **Component Attachment**: Scene entity in space.hstf (local, not networked)
 * **Component Networking**: Local only — UI component, client-side only
 * **Component Ownership**: Not Networked
 *
 * Usage from another component:
 * ```ts
 * const gauge = entity.getComponent(PowerGaugeComponent);
 * gauge?.setFillLevel(0.75); // 75% filled
 * gauge?.setVisible(true);   // show the gauge
 * ```
 */
import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  ExecuteOn,
  UiViewModel,
  uiViewModel,
  NetworkingService,
  clamp,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { CustomUiComponent } from 'meta/worlds';
import { AimStartedEvent, AimUpdatedEvent, PhaseChangedEvent } from '../Events/GameEvents';
import { GamePhase } from '../Types';

const BAR_MAX_HEIGHT = 510;

@uiViewModel()
class PowerGaugeViewModel extends UiViewModel {
  FillHeight: number = 0;
  GaugeVisible: boolean = false;
}

@component()
export class PowerGaugeComponent extends Component {
  private _viewModel: PowerGaugeViewModel = new PowerGaugeViewModel();
  private _customUi: Maybe<CustomUiComponent> = null;

  /**
   * Initialise the ViewModel and bind it to the CustomUiComponent.
   * Runs only on the client — server has no UI.
   */
  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) {
      return;
    }
    console.log('[PowerGaugeComponent] Initialising on client');
    this._customUi = this.entity.getComponent(CustomUiComponent);
    if (this._customUi) {
      this._customUi.dataContext = this._viewModel;
    }
  }

  // ── Event handlers ────────────────────────────────────────────────────

  @subscribe(AimStartedEvent)
  onAimStarted(): void {
    this._setVisible(true);
    this._setFillLevel(0);
  }

  @subscribe(AimUpdatedEvent)
  onAimUpdated(p: { power: number }): void {
    this._setFillLevel(p.power);
  }

  @subscribe(PhaseChangedEvent)
  onPhaseChanged(p: { phase: number }): void {
    if (p.phase !== GamePhase.Aim) {
      this._setVisible(false);
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private _setFillLevel(level: number): void {
    const newHeight = clamp(level, 0, 1) * BAR_MAX_HEIGHT;
    if (this._viewModel.FillHeight !== newHeight) {
      this._viewModel.FillHeight = newHeight;
    }
  }

  private _setVisible(visible: boolean): void {
    if (this._viewModel.GaugeVisible !== visible) {
      this._viewModel.GaugeVisible = visible;
    }
  }
}
