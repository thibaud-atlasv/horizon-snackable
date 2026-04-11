import {
  component,
  Component,
  Color,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  OnEntityDestroyEvent,
  subscribe,
  uiViewModel,
  UiViewModel,
  lerp,
} from 'meta/worlds';

import { Events, BackgroundEvents, ComboHUDEvents } from '../Types';

const TICK_MS = 30;
const BASE_OVERLAY_OPACITY = 0;
const MAX_OVERLAY_OPACITY = 0.15;
const DECAY_RATE = 0.01;
const IDLE_THRESHOLD_S = 1.5;
const IDLE_DECAY_RATE = 0.015;

const VERBOSE_LOG = false;

/**
 * ViewModel exposing reactive properties for the background color animation overlay.
 * XAML binds to these properties; changes trigger automatic UI updates.
 */
@uiViewModel()
export class BackgroundAnimViewModelData extends UiViewModel {
  overlayColor: string = '#FF00FF';
  overlayOpacity: number = 0;
}

/**
 * Component Attachment: Scene Entity (Background entity with existing CustomUiComponent)
 * Component Networking: Local
 * Component Ownership: Not Networked
 *
 * Drives a color pulse overlay on the background XAML using the destroyed brick's color.
 * Other game systems can intensify the effect by sending BackgroundEvents.IntensifyBackground
 * or by triggering standard game events (BrickDestroyed, ExplosionChain, BallLost, IncrementCombo).
 */
@component()
export class BackgroundAnimViewModel extends Component {
  private _viewModel = new BackgroundAnimViewModelData();
  private _intervalId: number | null = null;

  private _pulseColor: Color = Color.white;
  private _currentIntensity: number = 0;
  private _targetIntensity: number = 0;
  private _decayPerTick: number = DECAY_RATE;
  private _idleTime: number = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi) {
      customUi.dataContext = this._viewModel;
    }

    this._intervalId = setInterval(() => {
      this._tick();
    }, TICK_MS);

    console.log('[BackgroundAnimViewModel] Initialized');
  }

  @subscribe(OnEntityDestroyEvent)
  onDestroy(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  // ── Game event auto-triggers ──────────────────────────────────

  @subscribe(Events.BrickDestroyed)
  onBrickDestroyed(payload: Events.BrickDestroyedPayload): void {
    this._pulseColor = payload.color;
    this._pulse(0.15, 0.3);
  }

  @subscribe(Events.ExplosionChain)
  onExplosionChain(payload: Events.ExplosionChainPayload): void {
    const scaled = Math.min(0.8, 0.4 + payload.chainSize * 0.1);
    this._pulse(scaled, 0.6);
  }

  @subscribe(Events.BallLost)
  onBallLost(_payload: Events.BallLostPayload): void {
    this._pulse(0.7, 1.0);
  }

  @subscribe(ComboHUDEvents.IncrementCombo)
  onComboIncrement(_payload: ComboHUDEvents.IncrementComboPayload): void {
    this._pulse(0.3, 0.4);
  }

  @subscribe(BackgroundEvents.IntensifyBackground)
  onIntensify(payload: BackgroundEvents.IntensifyBackgroundPayload): void {
    this._pulse(payload.intensity, payload.durationSeconds);
  }

  // ── Animation tick ─────────────────────────────────────────────

  private _tick(): void {
    const tickSeconds = TICK_MS / 1000;
    this._idleTime += tickSeconds;

    // Normal pulse decay
    if (this._currentIntensity > 0) {
      this._currentIntensity = Math.max(0, this._currentIntensity - this._decayPerTick);
    }

    // Additional idle decay: after threshold, accelerate fade to fully transparent
    if (this._idleTime >= IDLE_THRESHOLD_S && this._currentIntensity > 0) {
      this._currentIntensity = Math.max(0, this._currentIntensity - IDLE_DECAY_RATE);
    }

    // Use the last brick's color for the overlay
    this._viewModel.overlayColor = this._pulseColor.toHex();

    // Overlay opacity scales with intensity
    this._viewModel.overlayOpacity = lerp(
      BASE_OVERLAY_OPACITY,
      MAX_OVERLAY_OPACITY,
      this._currentIntensity,
    );
  }

  private _pulse(intensity: number, durationSeconds: number): void {
    this._idleTime = 0;

    // Only override if new pulse is stronger than current
    if (intensity > this._currentIntensity) {
      this._currentIntensity = intensity;
      this._targetIntensity = intensity;
    }

    // Compute decay rate so intensity reaches ~0 after the given duration
    const ticksInDuration = (durationSeconds * 1000) / TICK_MS;
    if (ticksInDuration > 0) {
      this._decayPerTick = Math.max(DECAY_RATE, intensity / ticksInDuration);
    }

    if (VERBOSE_LOG) {
      console.log(`[BackgroundAnimViewModel] Pulse intensity=${intensity.toFixed(2)} duration=${durationSeconds}s`);
    }
  }
}
