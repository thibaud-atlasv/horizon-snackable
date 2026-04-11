import {
  component,
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  subscribe,
  uiViewModel,
  UiViewModel,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';

import { ComboHUDEvents, Events } from '../Types';

const POP_DURATION = 0.05;
const GROW_FADE_DURATION = 0.6;
const SCALE_BURST = 1.5;
const SCALE_MAX = 6.0;
const FADE_DURATION = 0.5;
const SHAKE_LIGHT = 2;
const SHAKE_HEAVY = 5;

const COLOR_CYAN = '#00FFFF';
const COLOR_HOT_PINK = '#FF69B4';
const COLOR_MAGENTA = '#FF00FF';
const COLOR_GOLD = '#FFD700';

const VERBOSE_LOG = false;

// Blend a hex color toward white (amt > 0) or black (amt < 0) by the given fraction [0..1].
function _blendHex(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const blend = (c: number): number => {
    const target = amt > 0 ? 255 : 0;
    return Math.round(c + (target - c) * Math.abs(amt));
  };

  const toHex = (c: number): string => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0');
  return `#${toHex(blend(r))}${toHex(blend(g))}${toHex(blend(b))}`;
}

const LIGHTEN_AMT = 0.2;
const DARKEN_AMT = 0.1;

/**
 * ViewModel exposing reactive properties for the combo counter UI.
 */
@uiViewModel()
export class ComboHUDViewModelData extends UiViewModel {
  comboText: string = '';
  showCombo: boolean = false;
  comboScale: number = 1.0;
  comboOpacity: number = 1.0;
  comboColor: string = COLOR_CYAN;
  comboColorTop: string = _blendHex(COLOR_CYAN, LIGHTEN_AMT);
  comboColorBottom: string = _blendHex(COLOR_CYAN, -DARKEN_AMT);
  shakeX: number = 0;
  shakeY: number = 0;
  showGlow: boolean = false;
}

/**
 * Component Attachment: Scene Entity (the entity hosting the CustomUiComponent for the combo HUD)
 * Component Networking: Local
 * Component Ownership: Not Networked
 *
 * Controller that binds the ComboHUDViewModelData to the CustomUiComponent
 * and drives combo counter animations (scale punch, shake, color, fade).
 */
@component()
export class ComboHUDViewModel extends Component {
  private _viewModel = new ComboHUDViewModelData();
  private _comboCount: number = 0;
  private _isFading: boolean = false;
  private _isAnimating: boolean = false;
  private _animTimer: number = 0;
  private _shakeTimer: number = 0;
  private _initialized: boolean = false;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi) {
      customUi.dataContext = this._viewModel;
    }
    this._initialized = true;
    console.log('[ComboHUDViewModel] Initialized');
  }

  // TEST: Reset visual combo on paddle hit (does NOT affect piercing/BallPowerService)
  // To revert: remove this handler and the Events import
  @subscribe(Events.PaddleHit)
  onPaddleHit(p: Events.PaddleHitPayload): void {
    if (!this._initialized) return;
    // Only reset on actual ball bounce (CoinService sends 0,0 velocities)
    if (p.ballVelocityY === 0) return;
    this._comboCount = 0;
  }

  @subscribe(ComboHUDEvents.IncrementCombo)
  onIncrementCombo(_payload: ComboHUDEvents.IncrementComboPayload): void {
    console.log("[ComboHUDViewModel] IncrementCombo event received");
    if (!this._initialized) return;

    this._comboCount++;
    this._isFading = false;

    // Only show combo from x2 onwards
    if (this._comboCount < 2) return;

    this._viewModel.comboText = `x${this._comboCount}`;
    this._viewModel.showCombo = true;
    this._viewModel.comboScale = 0;
    this._viewModel.comboOpacity = 1.0;
    this._animTimer = 0;
    this._isAnimating = true;

    const baseColor = this._getColor(this._comboCount);
    this._viewModel.comboColor = baseColor;
    this._viewModel.comboColorTop = _blendHex(baseColor, LIGHTEN_AMT);
    this._viewModel.comboColorBottom = _blendHex(baseColor, -DARKEN_AMT);
    this._viewModel.showGlow = this._comboCount >= 5;

    this._shakeTimer = this._comboCount >= 10 ? 0.15 : 0;

    if (VERBOSE_LOG) {
      console.log(`[ComboHUDViewModel] Combo incremented to ${this._comboCount}`);
    }
  }

  @subscribe(ComboHUDEvents.ResetCombo)
  onResetCombo(_payload: ComboHUDEvents.ResetComboPayload): void {
    if (!this._initialized) return;
    if (this._comboCount === 0) return;

    console.log(`[ComboHUDViewModel] Combo reset from ${this._comboCount}`);
    this._isFading = true;
    this._isAnimating = true;
  }

  @subscribe(OnWorldUpdateEvent)
  onWorldUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._initialized || !this._isAnimating) return;

    const dt = payload.deltaTime;

    if (this._isFading) {
      this._tickFade(dt);
      return;
    }

    this._tickPopAndGrow(dt);
    this._tickShake(dt);
  }

  private _tickPopAndGrow(dt: number): void {
    this._animTimer += dt;

    if (this._animTimer <= POP_DURATION) {
      // Phase 1: pop-in — scale 0 → SCALE_BURST
      const t = POP_DURATION > 0 ? Math.min(this._animTimer / POP_DURATION, 1) : 1;
      this._viewModel.comboScale = t * SCALE_BURST;
      this._viewModel.comboOpacity = 1.0;
    } else {
      // Phase 2: grow + fade — scale SCALE_BURST → SCALE_MAX, opacity 1 → 0
      const elapsed = this._animTimer - POP_DURATION;
      const t = GROW_FADE_DURATION > 0 ? Math.min(elapsed / GROW_FADE_DURATION, 1) : 1;
      this._viewModel.comboScale = SCALE_BURST + (SCALE_MAX - SCALE_BURST) * t;
      const opacity = t < 0.15 ? 1.0 - (t / 0.15) * 0.82 : 0.18 * (1.0 - (t - 0.15) / 0.85);
      this._viewModel.comboOpacity = Math.max(opacity, 0);

      if (t >= 1) {
        this._viewModel.showCombo = false;
        this._viewModel.comboOpacity = 0;
        this._isAnimating = false;
        this._shakeTimer = 0;
        this._viewModel.shakeX = 0;
        this._viewModel.shakeY = 0;
      }
    }
  }

  private _tickShake(dt: number): void {
    if (this._shakeTimer <= 0) {
      if (this._viewModel.shakeX !== 0) this._viewModel.shakeX = 0;
      if (this._viewModel.shakeY !== 0) this._viewModel.shakeY = 0;
      return;
    }

    this._shakeTimer -= dt;
    const intensity = this._comboCount >= 20 ? SHAKE_HEAVY : SHAKE_LIGHT;
    this._viewModel.shakeX = (Math.random() - 0.5) * 2 * intensity;
    this._viewModel.shakeY = (Math.random() - 0.5) * 2 * intensity;
  }

  private _tickFade(dt: number): void {
    const next = this._viewModel.comboOpacity - dt / FADE_DURATION;
    if (next <= 0) {
      this._resetState();
      return;
    }
    this._viewModel.comboOpacity = next;
  }

  private _resetState(): void {
    this._comboCount = 0;
    this._isFading = false;
    this._isAnimating = false;
    this._shakeTimer = 0;

    this._viewModel.comboText = '';
    this._viewModel.showCombo = false;
    this._viewModel.comboScale = 1.0;
    this._viewModel.comboOpacity = 1.0;
    this._viewModel.comboColor = COLOR_CYAN;
    this._viewModel.comboColorTop = _blendHex(COLOR_CYAN, LIGHTEN_AMT);
    this._viewModel.comboColorBottom = _blendHex(COLOR_CYAN, -DARKEN_AMT);
    this._viewModel.shakeX = 0;
    this._viewModel.shakeY = 0;
    this._viewModel.showGlow = false;
  }

  private _getColor(count: number): string {
    if (count >= 15) return COLOR_GOLD;
    if (count >= 10) return COLOR_MAGENTA;
    if (count >= 5) return COLOR_HOT_PINK;
    return COLOR_CYAN;
  }
}
