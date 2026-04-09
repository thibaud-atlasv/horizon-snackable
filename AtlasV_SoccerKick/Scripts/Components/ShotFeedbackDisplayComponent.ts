import {
  Component, component, subscribe,
  OnEntityStartEvent, OnWorldUpdateEvent,
  ExecuteOn,
  UiViewModel,
  uiViewModel,
} from 'meta/worlds';
import { type OnWorldUpdateEventPayload, type Maybe, CustomUiComponent } from 'meta/worlds';
import {
  ShotFeedbackResultEvent,
  ShotFeedbackResultPayload,
} from '../Events/ShotFeedbackEvents';

// ── Outcome constants (mirrors ShotOutcome const enum) ──
const OUTCOME_GOAL    = 0;
const OUTCOME_SAVE    = 1;
const OUTCOME_POSTHIT = 2;

// ── Animation profiles ──────────────────────────────────────────────────────

interface IAnimProfile {
  scalePhaseDur: number;
  holdDur:       number;
  fadeDur:       number;
  overshoot:     number;  // peak scale during pop-in
  finalScale:    number;  // resting scale
  shakeIntensity: number;
  shakeFreq:     number;
  pulseAmp:      number;  // 0 = no pulse during hold
  pulseFreq:     number;  // Hz of the pulse
  bounceCount:   number;  // extra bounces during scale phase (0 = single elastic)
  fadeScaleGrow: number;  // scale increase during fade-out
  fadeDriftY:    number;  // upward drift during fade-out
}

const PROFILE_DEFAULT: IAnimProfile = {
  scalePhaseDur:  0.18,
  holdDur:        0.45,
  fadeDur:        0.4,
  overshoot:      2.2,
  finalScale:     1.4,
  shakeIntensity: 18,
  shakeFreq:      22,
  pulseAmp:       0,
  pulseFreq:      0,
  bounceCount:    0,
  fadeScaleGrow:  0.3,
  fadeDriftY:     20,
};

const PROFILE_GOAL: IAnimProfile = {
  scalePhaseDur:  0.22,
  holdDur:        0.6,
  fadeDur:        0.45,
  overshoot:      3.0,    // massive pop
  finalScale:     1.7,    // stays big
  shakeIntensity: 28,     // heavy shake
  shakeFreq:      18,     // slower = more impactful
  pulseAmp:       0.15,   // breathe during hold
  pulseFreq:      6,      // Hz
  bounceCount:    2,      // double bounce on pop-in
  fadeScaleGrow:  0.5,    // big expand on exit
  fadeDriftY:     30,     // floats up more
};

/**
 * ShotFeedbackDisplayComponent
 *
 * Subscribes to ShotFeedbackResultEvent and drives a ViewModel to animate
 * center-screen text feedback (GOAL!/MISS!/SAVED!) with elastic scale,
 * shake, and fade effects. GOAL gets an extreme variant.
 */
@uiViewModel()
class ShotFeedbackViewModel extends UiViewModel {
  FeedbackText: string = '';
  TextColor: string = '#FFFFFF';
  Opacity: number = 0;
  ScaleX: number = 1;
  ScaleY: number = 1;
  TranslateX: number = 0;
  TranslateY: number = 0;
  IsVisible: boolean = false;
  PointsText: string = '';
  PointsOpacity: number = 0;
}

@component()
export class ShotFeedbackDisplayComponent extends Component {
  private _viewModel: ShotFeedbackViewModel = new ShotFeedbackViewModel();
  private _customUi: Maybe<CustomUiComponent> = null;

  private _animating = false;
  private _elapsed   = 0;
  private _profile: IAnimProfile = PROFILE_DEFAULT;
  private _totalDur  = 0;

  private _currentPoints = 0;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    this._customUi = this.entity.getComponent(CustomUiComponent);
    if (this._customUi) {
      this._customUi.dataContext = this._viewModel;
    }
  }

  @subscribe(ShotFeedbackResultEvent, { execution: ExecuteOn.Everywhere })
  onShotFeedback(payload: ShotFeedbackResultPayload): void {
    const outcome = payload.outcome;
    const points  = payload.pointsEarned;

    let text:  string;
    let color: string;

    if (outcome === OUTCOME_GOAL) {
      text  = 'GOAL!';
      color = '#FFD700';
      this._profile = PROFILE_GOAL;
      this._currentPoints = points;
    } else if (outcome === OUTCOME_SAVE) {
      text  = 'SAVED!';
      color = '#FF4444';
      this._profile = PROFILE_DEFAULT;
      this._currentPoints = 0;
    } else if (outcome === OUTCOME_POSTHIT) {
      text  = 'POST!';
      color = '#FFFFFF';
      this._profile = PROFILE_DEFAULT;
      this._currentPoints = 0;
    } else {
      text  = 'MISS!';
      color = '#FF6B35';
      this._profile = PROFILE_DEFAULT;
      this._currentPoints = 0;
    }

    const pr = this._profile;
    this._totalDur = pr.scalePhaseDur + pr.holdDur + pr.fadeDur;

    this._elapsed   = 0;
    this._animating = true;

    this._viewModel.FeedbackText = text;
    this._viewModel.TextColor    = color;
    this._viewModel.IsVisible    = true;
    this._viewModel.Opacity      = 1;
    this._viewModel.ScaleX       = 0;
    this._viewModel.ScaleY       = 0;
    this._viewModel.TranslateX   = 0;
    this._viewModel.TranslateY   = 0;
    this._viewModel.PointsText    = this._currentPoints > 0 ? `+${this._currentPoints}` : '';
    this._viewModel.PointsOpacity = this._currentPoints > 0 ? 1 : 0;
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Everywhere })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._animating) return;

    this._elapsed += payload.deltaTime;
    const pr = this._profile;

    if (this._elapsed >= this._totalDur) {
      this._animating = false;
      this._viewModel.IsVisible     = false;
      this._viewModel.Opacity       = 0;
      this._viewModel.ScaleX        = 0;
      this._viewModel.ScaleY        = 0;
      this._viewModel.TranslateX    = 0;
      this._viewModel.TranslateY    = 0;
      this._viewModel.PointsOpacity = 0;
      return;
    }

    const t = this._elapsed;

    if (t < pr.scalePhaseDur) {
      this._animScalePhase(t, pr);
    } else if (t < pr.scalePhaseDur + pr.holdDur) {
      this._animHoldPhase(t - pr.scalePhaseDur, pr);
    } else {
      this._animFadePhase(t - pr.scalePhaseDur - pr.holdDur, pr);
    }
  }

  // ── Phase 1: Pop-in with elastic + optional multi-bounce ──────────────────

  private _animScalePhase(t: number, pr: IAnimProfile): void {
    const p = t / pr.scalePhaseDur; // 0..1

    let scale: number;
    if (pr.bounceCount > 0) {
      // Multi-bounce: elastic with extra oscillations
      scale = this._elasticBounce(p, pr.bounceCount) * pr.overshoot;
    } else {
      scale = this._elasticOut(p) * pr.overshoot;
    }

    this._viewModel.ScaleX  = scale;
    this._viewModel.ScaleY  = scale;
    this._viewModel.Opacity = 1;

    // Shake
    const shakeDecay = 1 - p;
    this._viewModel.TranslateX = Math.sin(t * pr.shakeFreq * 6.28) * pr.shakeIntensity * shakeDecay;
    this._viewModel.TranslateY = Math.cos(t * pr.shakeFreq * 1.7 * 6.28) * pr.shakeIntensity * 0.6 * shakeDecay;
  }

  // ── Phase 2: Hold with settle + optional pulse ────────────────────────────

  private _animHoldPhase(ht: number, pr: IAnimProfile): void {
    const holdP = ht / pr.holdDur;
    // Settle from overshoot to final
    const settleP = this._easeOutQuad(Math.min(holdP * 2.5, 1));
    let scale = pr.overshoot + (pr.finalScale - pr.overshoot) * settleP;

    // Breathing pulse
    if (pr.pulseAmp > 0) {
      scale += Math.sin(ht * pr.pulseFreq * 6.28) * pr.pulseAmp;
    }

    this._viewModel.ScaleX     = scale;
    this._viewModel.ScaleY     = scale;
    this._viewModel.Opacity    = 1;
    this._viewModel.TranslateX = 0;
    this._viewModel.TranslateY = 0;
  }

  // ── Phase 3: Fade-out + expand + drift ────────────────────────────────────

  private _animFadePhase(ft: number, pr: IAnimProfile): void {
    const fadeP     = ft / pr.fadeDur;
    const easedFade = this._easeInQuad(fadeP);

    this._viewModel.Opacity       = 1 - easedFade;
    this._viewModel.PointsOpacity = 1 - easedFade;

    const scale = pr.finalScale + easedFade * pr.fadeScaleGrow;
    this._viewModel.ScaleX     = scale;
    this._viewModel.ScaleY     = scale;
    this._viewModel.TranslateX = 0;
    this._viewModel.TranslateY = -easedFade * pr.fadeDriftY;
  }

  // ── Easing functions ──────────────────────────────────────────────────────

  private _elasticOut(t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const p = 0.4;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * 6.28 / p) + 1;
  }

  /** Elastic with extra bounces — more oscillations, tighter decay. */
  private _elasticBounce(t: number, bounces: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const freq = 0.4 / (bounces + 1);
    return Math.pow(2, -12 * t) * Math.sin((t - freq / 4) * 6.28 / freq) + 1;
  }

  private _easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private _easeInQuad(t: number): number {
    return t * t;
  }
}
