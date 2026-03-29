import {
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  UiViewModel,
  component,
  subscribe,
  uiViewModel,
  type Maybe,
} from 'meta/worlds';

import { Events, HUDEvents, GamePhase } from '../Types';
import { FishCollectionService } from '../Fish/FishCollectionService';

// ─── ViewModel ────────────────────────────────────────────────────────────────
@uiViewModel()
export class FishingHUDData extends UiViewModel {
  /** Current game phase label (for debug / phase indicator). */
  phaseLabel: string = 'Idle';
  /** Show gauge container. */
  showGauge: boolean = false;
  /** Gauge fill 0–1. */
  gaugeValue: number = 0;
  /** 'cast' or 'reel' — drives gauge color in XAML. */
  gaugeMode: string = 'cast';
  /** Total unique species caught. */
  uniqueCaught: number = 0;
  /** Dynamic gauge fill color (hex string) based on fill level during charging. */
  gaugeColor: string = '#00FF00';
}

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * FishingHUDViewModel — binds the main gameplay HUD to reactive XAML.
 *
 * ── Editor setup ────────────────────────────────────────────────────────────────
 * Attach to the entity that has the CustomUiComponent for the main HUD XAML.
 *
 * ── XAML bindings ────────────────────────────────────────────────────────────────
 * <Label text="{phaseLabel}" />
 * <Panel visible="{showGauge}">
 *   <Gauge value="{gaugeValue}" mode="{gaugeMode}" />
 * </Panel>
 * <Label text="Caught: {uniqueCaught}" />
 */
@component()
export class FishingHUDViewModel extends Component {

  private _vm  = new FishingHUDData();
  private _ui: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) this._ui.dataContext = this._vm;
  }

  @subscribe(Events.PhaseChanged)
  private _onPhase(p: Events.PhaseChangedPayload): void {
    this._vm.phaseLabel = GamePhase[p.phase];
    this._vm.showGauge  = p.phase === GamePhase.Charging || p.phase === GamePhase.Reeling;
  }

  @subscribe(HUDEvents.UpdateGauge)
  private _onGauge(p: HUDEvents.UpdateGaugePayload): void {
    this._vm.gaugeValue = p.value;
    this._vm.gaugeMode  = p.mode;
    
    // Update gauge color based on fill level during charging
    // Only apply dynamic colors in 'cast' mode (charging phase)
    if (p.mode === 'cast') {
      this._vm.gaugeColor = this._getGaugeColorForValue(p.value);
    } else {
      // Reel mode uses the static turquoise color from XAML
      this._vm.gaugeColor = '#00CED1';
    }
  }

  /**
   * Calculates gauge fill color by lerping between three stops (0–1):
   *   0.0 → green  (#00FF00)
   *   0.5 → orange (#FFAA00)
   *   1.0 → red    (#FF0000)
   */
  private _getGaugeColorForValue(value: number): string {
    const v = Math.max(0, Math.min(1, value));
    let r: number, g: number, b: number;
    if (v <= 0.5) {
      // green → orange  (t: 0→1 over first half)
      const t = v / 0.5;
      r = Math.round(0x00 + t * (0xFF - 0x00));
      g = Math.round(0xFF + t * (0xAA - 0xFF));
      b = 0x00;
    } else {
      // orange → red  (t: 0→1 over second half)
      const t = (v - 0.5) / 0.5;
      r = 0xFF;
      g = Math.round(0xAA + t * (0x00 - 0xAA));
      b = 0x00;
    }
    return `#${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`;
  }

  @subscribe(Events.FishCaught)
  private _onCaught(_p: Events.FishCaughtPayload): void {
    this._vm.uniqueCaught = FishCollectionService.get().totalUnique();
  }
}
