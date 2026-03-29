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
import { FishRegistry } from '../Fish/FishRegistry';

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
  }

  @subscribe(Events.FishCaught)
  private _onCaught(_p: Events.FishCaughtPayload): void {
    this._vm.uniqueCaught = FishRegistry.get().activeCount; // or use collection service
  }
}
