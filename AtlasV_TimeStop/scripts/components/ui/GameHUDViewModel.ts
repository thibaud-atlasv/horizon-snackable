import {
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  UiViewModel,
  component,
  subscribe,
  uiViewModel,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { Events, GamePhase, HUDEvents } from '../../Types';
import { INTRO_DURATION_MS } from '../../Constants';

@uiViewModel()
export class GameHUDViewModelData extends UiViewModel {
  score: number = 0;
  scoreAnimating: boolean = false;
  scoreVisible: boolean = false;
  logoVisible: boolean = true;

  centerText: string = '';
  showCenterText: boolean = false;
  centerTextColor: string = '#FFFFFF';
  centerTextScale: number = 1.0;
  tapToStartPulsing: boolean = false;
}

@component()
export class GameHUDViewModel extends Component {
  private _viewModel = new GameHUDViewModelData();
  private _customUi: Maybe<CustomUiComponent> = null;
  private _countdownTimer: ReturnType<typeof setTimeout> | null = null;
  private _scoreAnimTimer: ReturnType<typeof setTimeout> | null = null;
  private _currentRoundIndex: number = 0;

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._customUi = this.entity.getComponent(CustomUiComponent);
    if (this._customUi) this._customUi.dataContext = this._viewModel;
    this._viewModel.showCenterText = false;
    this._viewModel.score = 0;
  }

  // ── Phase Changes ────────────────────────────────────────────────────────────

  @subscribe(Events.PhaseChanged)
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._clearCountdownTimer();

    switch (p.phase) {
      case GamePhase.Start:
        this._showCenterText('TAP TO START', '#FF5D10');
        this._viewModel.scoreVisible = false;
        this._viewModel.logoVisible = true;
        // Defer pulsing so XAML bindings are mounted before the trigger fires
        this._viewModel.tapToStartPulsing = false;
        setTimeout(() => { this._viewModel.tapToStartPulsing = true; }, 100);
        break;
      case GamePhase.Intro:
        this._viewModel.tapToStartPulsing = false;
        this._viewModel.scoreVisible = true;
        this._viewModel.logoVisible = false;
        this._startIntroSequence();
        break;
      case GamePhase.Falling:
      case GamePhase.Clearing:
      case GamePhase.RoundEnd:
      case GamePhase.GameOver:
      case GamePhase.End:
        this._viewModel.tapToStartPulsing = false;
        this._hideCenterText();
        break;
    }
  }

  // ── Round Preparation ────────────────────────────────────────────────────────

  @subscribe(Events.PrepareRound)
  onPrepareRound(p: Events.PrepareRoundPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._currentRoundIndex = p.roundIndex;
  }

  // ── Score Updates ────────────────────────────────────────────────────────────

  @subscribe(HUDEvents.UpdateScore)
  onUpdateScore(payload: HUDEvents.UpdateScorePayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const oldScore = this._viewModel.score;
    this._viewModel.score = payload.score;
    if (payload.score > oldScore) this._triggerScoreAnimation();
  }

  // ── Restart ──────────────────────────────────────────────────────────────────

  @subscribe(Events.Restart)
  onRestart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._clearCountdownTimer();
    this._clearScoreAnimTimer();
    this._viewModel.score = 0;
    this._viewModel.scoreAnimating = false;
    this._viewModel.scoreVisible = false;
    this._viewModel.logoVisible = true;
    this._viewModel.tapToStartPulsing = false;
    this._hideCenterText();
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  private _showCenterText(text: string, color: string): void {
    this._viewModel.centerText = text;
    this._viewModel.centerTextColor = color;
    this._viewModel.showCenterText = true;
    this._viewModel.centerTextScale = 1.0;
  }

  private _hideCenterText(): void {
    this._viewModel.showCenterText = false;
    this._viewModel.centerText = '';
  }

  private _startIntroSequence(): void {
    const steps = [
      { text: '3', color: '#FF5D10' },
      { text: '2', color: '#FF5D10' },
      { text: '1', color: '#FF5D10' },
      { text: `Round ${this._currentRoundIndex + 1}`, color: '#FF5D10' },
    ];
    const COUNTDOWN_STEP_MS = INTRO_DURATION_MS / steps.length;

    steps.forEach((step, i) => {
      this._countdownTimer = setTimeout(() => {
        this._showCenterText(step.text, step.color);
        if (i === steps.length - 1) this._countdownTimer = null;
      }, i * COUNTDOWN_STEP_MS);
    });
  }

  private _triggerScoreAnimation(): void {
    this._clearScoreAnimTimer();
    this._viewModel.scoreAnimating = true;
    this._scoreAnimTimer = setTimeout(() => {
      this._viewModel.scoreAnimating = false;
      this._scoreAnimTimer = null;
    }, 200);
  }

  private _clearCountdownTimer(): void {
    if (this._countdownTimer !== null) {
      clearTimeout(this._countdownTimer);
      this._countdownTimer = null;
    }
  }

  private _clearScoreAnimTimer(): void {
    if (this._scoreAnimTimer !== null) {
      clearTimeout(this._scoreAnimTimer);
      this._scoreAnimTimer = null;
    }
  }
}
