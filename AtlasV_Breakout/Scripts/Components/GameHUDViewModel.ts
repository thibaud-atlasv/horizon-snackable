import {
  component,
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  OnEntityDestroyEvent,
  subscribe,
  uiViewModel,
  UiViewModel,
} from 'meta/worlds';

import { Events, HUDEvents } from '../Types';

const ANIM_INTERVAL_MS = 30;
const SCALE_PUNCH = 1.3;
const GLOW_MAX = 0.8;
const SETTLE_SPEED = 0.15;

// Bounce animation constants
const BOUNCE_INTERVAL_MS = 35;
const BOUNCE_SPEED = 10;
const BOUNCE_RANGE_X = 250;
const BOUNCE_RANGE_Y = 1300;
const SQUASH_SCALE_X = 1.1;
const SQUASH_SCALE_Y = 0.9;
const SQUASH_RECOVER_SPEED = 0.32;
const ROTATION_PUNCH = 0; // degrees on bounce hit
const ROTATION_RECOVER_SPEED = 0.1;
const COLOR_PHASE_SPEED = 0.005;

// Reveal animation constants
const REVEAL_INTERVAL_MS = 16;
const REVEAL_DURATION_MS = 500;
const REVEAL_OVERSHOOT = 1.15;
const REVEAL_DAMPING = 5;
const REVEAL_FREQUENCY = 2.5;

const VERBOSE_LOG = false;

/**
 * ViewModel exposing reactive properties for HUD UI binding.
 * UI binds to these properties; changes trigger automatic UI updates.
 */
@uiViewModel()
export class GameHUDViewModelData extends UiViewModel {
  displayScore: number = 0;
  scoreScale: number = 1;
  scoreGlowOpacity: number = 0;
  lives: number = 3;
  centerText: string = '';
  showCenterText: boolean = false;
  centerTextTranslateX: number = 0;
  centerTextTranslateY: number = 0;
  centerTextScaleX: number = 1;
  centerTextScaleY: number = 1;
  centerTextRotation: number = 0;
  centerTextColorPhase: number = 0;
  showScore: boolean = false;
  scoreBarScale: number = 0;
  scoreBarOpacity: number = 0;
}

/**
 * Component Attachment: Scene Entity (the entity hosting the CustomUiComponent for the HUD)
 * Component Networking: Local
 * Component Ownership: Not Networked
 *
 * Controller component that binds the ViewModel to the CustomUiComponent
 * and listens for HUD update events from other systems.
 * Drives casino-style score animations via setInterval (not per-frame).
 */
@component()
export class GameHUDViewModel extends Component {
  private _viewModel = new GameHUDViewModelData();
  private _targetScore: number = 0;
  private _scoreRevealed: boolean = false;
  private _animIntervalId: number | null = null;
  private _animTick: number = 0;
  private _settling: boolean = false;

  // Bounce animation state
  private _bounceIntervalId: number | null = null;

  // Reveal animation state
  private _revealIntervalId: number | null = null;
  private _revealElapsed: number = 0;
  private _bounceDirection: number = 1; // 1 = right, -1 = left
  private _bounceDirectionY: number = 1; // 1 = down, -1 = up
  private _squashing: boolean = false;
  private _rotationTarget: number = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi) {
      customUi.dataContext = this._viewModel;
    }
  }

  @subscribe(OnEntityDestroyEvent)
  onDestroy(): void {
    this._clearAnimInterval();
    this._clearBounceInterval();
    this._clearRevealInterval();
  }

  // ── Event subscriptions ────────────────────────────────────

  @subscribe(HUDEvents.UpdateScore)
  onUpdateScore(payload: HUDEvents.UpdateScorePayload): void {
    this._targetScore = payload.score;
    this._settling = false;
    this._animTick = 0;

    if (VERBOSE_LOG) {
      console.log(`[GameHUDViewModel] Score target updated to ${this._targetScore}`);
    }

    // Start animation interval if not already running
    if (this._animIntervalId === null) {
      this._animIntervalId = setInterval(() => {
        this._tickScoreAnimation();
      }, ANIM_INTERVAL_MS);
    }
  }

  @subscribe(HUDEvents.UpdateLives)
  onUpdateLives(payload: HUDEvents.UpdateLivesPayload): void {
    this._viewModel.lives = payload.lives;
  }

  @subscribe(HUDEvents.ShowMessage)
  onShowMessage(payload: HUDEvents.ShowMessagePayload): void {
    this._viewModel.centerText = payload.message.toUpperCase();
    this._viewModel.showCenterText = true;
    this._startBounce();
  }

  @subscribe(Events.LoadLevel)
  onLoadLevel(_payload: Events.LoadLevelPayload): void {
    if (!this._scoreRevealed) {
      this._scoreRevealed = true;
      this._viewModel.showScore = true;
      this._startRevealAnimation();
    }
  }

  @subscribe(HUDEvents.HideMessage)
  onHideMessage(_payload: HUDEvents.HideMessagePayload): void {
    this._viewModel.centerText = '';
    this._viewModel.showCenterText = false;
    this._clearBounceInterval();
    this._resetBounceProperties();
  }

  // ── Bounce animation ──────────────────────────────────────

  private _startBounce(): void {
    this._clearBounceInterval();
    this._resetBounceProperties();
    this._bounceDirection = Math.random() > 0.5 ? 1 : -1;
    this._bounceDirectionY = Math.random() > 0.5 ? 1 : -1;
    this._squashing = false;
    this._rotationTarget = 0;

    this._bounceIntervalId = setInterval(() => {
      this._tickBounce();
    }, BOUNCE_INTERVAL_MS);

    if (VERBOSE_LOG) {
      console.log('[GameHUDViewModel] Bounce animation started');
    }
  }

  private _tickBounce(): void {
    const vm = this._viewModel;

    // Move diagonally
    vm.centerTextTranslateX += BOUNCE_SPEED * this._bounceDirection;
    vm.centerTextTranslateY += BOUNCE_SPEED * this._bounceDirectionY;

    let hitEdge = false;

    // Check X edges
    if (vm.centerTextTranslateX >= BOUNCE_RANGE_X) {
      vm.centerTextTranslateX = BOUNCE_RANGE_X;
      this._bounceDirection = -1;
      hitEdge = true;
    } else if (vm.centerTextTranslateX <= -BOUNCE_RANGE_X) {
      vm.centerTextTranslateX = -BOUNCE_RANGE_X;
      this._bounceDirection = 1;
      hitEdge = true;
    }

    // Check Y edges
    if (vm.centerTextTranslateY >= BOUNCE_RANGE_Y) {
      vm.centerTextTranslateY = BOUNCE_RANGE_Y;
      this._bounceDirectionY = -1;
      hitEdge = true;
    } else if (vm.centerTextTranslateY <= -BOUNCE_RANGE_Y) {
      vm.centerTextTranslateY = -BOUNCE_RANGE_Y;
      this._bounceDirectionY = 1;
      hitEdge = true;
    }

    // On any edge hit: squash + rotation punch
    if (hitEdge) {
      this._squashing = true;
      vm.centerTextScaleX = SQUASH_SCALE_X;
      vm.centerTextScaleY = SQUASH_SCALE_Y;
      this._rotationTarget = (Math.random() > 0.5 ? 1 : -1) * ROTATION_PUNCH;
    }

    // Recover squash towards 1.0
    if (this._squashing) {
      const doneX = Math.abs(vm.centerTextScaleX - 1.0) < 0.01;
      const doneY = Math.abs(vm.centerTextScaleY - 1.0) < 0.01;

      if (!doneX) {
        vm.centerTextScaleX += (1.0 - vm.centerTextScaleX) * SQUASH_RECOVER_SPEED;
      } else {
        vm.centerTextScaleX = 1.0;
      }

      if (!doneY) {
        vm.centerTextScaleY += (1.0 - vm.centerTextScaleY) * SQUASH_RECOVER_SPEED;
      } else {
        vm.centerTextScaleY = 1.0;
      }

      if (doneX && doneY) {
        this._squashing = false;
      }
    }

    // Recover rotation towards 0
    if (Math.abs(vm.centerTextRotation - 0) > 0.1) {
      vm.centerTextRotation += (0 - vm.centerTextRotation) * ROTATION_RECOVER_SPEED;
    } else if (Math.abs(this._rotationTarget) > 0.1) {
      // Apply rotation target then clear it
      vm.centerTextRotation = this._rotationTarget;
      this._rotationTarget = 0;
    } else {
      vm.centerTextRotation = 0;
    }

    // Increment color phase for continuous cycling
    vm.centerTextColorPhase = (vm.centerTextColorPhase + COLOR_PHASE_SPEED) % 1.0;
  }

  private _clearBounceInterval(): void {
    if (this._bounceIntervalId !== null) {
      clearInterval(this._bounceIntervalId);
      this._bounceIntervalId = null;

      if (VERBOSE_LOG) {
        console.log('[GameHUDViewModel] Bounce interval cleared');
      }
    }
  }

  private _resetBounceProperties(): void {
    this._viewModel.centerTextTranslateX = 0;
    this._viewModel.centerTextTranslateY = 0;
    this._viewModel.centerTextScaleX = 1;
    this._viewModel.centerTextScaleY = 1;
    this._viewModel.centerTextRotation = 0;
    this._viewModel.centerTextColorPhase = 0;
    this._squashing = false;
    this._rotationTarget = 0;
  }

  // ── Casino animation via setInterval ───────────────────────

  private _tickScoreAnimation(): void {
    if (this._settling) {
      this._tickSettle();
      return;
    }

    const remaining = this._targetScore - this._viewModel.displayScore;

    if (remaining <= 0) {
      // Target reached, begin settle phase
      this._viewModel.displayScore = this._targetScore;
      this._settling = true;
      return;
    }

    // Roll-up: accelerated step (remaining / 8, min 1)
    const step = Math.max(1, Math.ceil(remaining / 8));
    this._viewModel.displayScore = Math.min(
      this._viewModel.displayScore + step,
      this._targetScore,
    );

    // Pulse scale and glow using sine wave on tick count
    this._animTick++;
    const wave = Math.sin(this._animTick * 0.4);
    const waveNorm = (wave + 1) / 2; // 0..1
    this._viewModel.scoreScale = 1.0 + (SCALE_PUNCH - 1.0) * waveNorm;
    this._viewModel.scoreGlowOpacity = GLOW_MAX * waveNorm;
  }

  private _tickSettle(): void {
    // Ease scale back to 1.0 and glow to 0
    let done = true;

    if (this._viewModel.scoreScale > 1.0) {
      this._viewModel.scoreScale = Math.max(
        1.0,
        this._viewModel.scoreScale - SETTLE_SPEED,
      );
      if (this._viewModel.scoreScale > 1.0) done = false;
    }

    if (this._viewModel.scoreGlowOpacity > 0) {
      this._viewModel.scoreGlowOpacity = Math.max(
        0,
        this._viewModel.scoreGlowOpacity - SETTLE_SPEED,
      );
      if (this._viewModel.scoreGlowOpacity > 0) done = false;
    }

    if (done) {
      this._viewModel.scoreScale = 1.0;
      this._viewModel.scoreGlowOpacity = 0;
      this._clearAnimInterval();
    }
  }

  private _clearAnimInterval(): void {
    if (this._animIntervalId !== null) {
      clearInterval(this._animIntervalId);
      this._animIntervalId = null;
      this._settling = false;
      this._animTick = 0;

      if (VERBOSE_LOG) {
        console.log('[GameHUDViewModel] Animation interval cleared');
      }
    }
  }

  // ── Reveal animation ──────────────────────────────────────

  private _startRevealAnimation(): void {
    this._clearRevealInterval();
    this._revealElapsed = 0;
    this._viewModel.scoreBarScale = 0;
    this._viewModel.scoreBarOpacity = 0;

    this._revealIntervalId = setInterval(() => {
      this._tickReveal();
    }, REVEAL_INTERVAL_MS);
  }

  private _tickReveal(): void {
    this._revealElapsed += REVEAL_INTERVAL_MS;
    const t = Math.min(this._revealElapsed / REVEAL_DURATION_MS, 1.0);

    // Damped spring: 1 - cos(t * π * freq) * e^(-t * damping)
    const spring = 1.0 - Math.cos(t * Math.PI * REVEAL_FREQUENCY) * Math.exp(-t * REVEAL_DAMPING);
    // Map spring [0..overshoot..1] — scale from 0 → overshoot → 1
    this._viewModel.scoreBarScale = spring * REVEAL_OVERSHOOT * (1.0 - t) + spring * t;

    // Quick opacity fade-in over first 40% of duration
    this._viewModel.scoreBarOpacity = Math.min(1.0, t / 0.4);

    if (t >= 1.0) {
      this._viewModel.scoreBarScale = 1.0;
      this._viewModel.scoreBarOpacity = 1.0;
      this._clearRevealInterval();
    }
  }

  private _clearRevealInterval(): void {
    if (this._revealIntervalId !== null) {
      clearInterval(this._revealIntervalId);
      this._revealIntervalId = null;
      this._revealElapsed = 0;
    }
  }

  // ── Public setters ─────────────────────────────────────────

  setScore(value: number): void {
    this._targetScore = value;
  }

  setLives(value: number): void {
    this._viewModel.lives = value;
  }

  showMessage(text: string): void {
    this._viewModel.centerText = text.toUpperCase();
    this._viewModel.showCenterText = true;
    this._startBounce();
  }

  hideMessage(): void {
    this._viewModel.centerText = '';
    this._viewModel.showCenterText = false;
    this._clearBounceInterval();
    this._resetBounceProperties();
  }
}
