import {
  Component, component, subscribe,
  OnEntityStartEvent,
  ExecuteOn,
  UiViewModel,
  uiViewModel,
  NetworkingService,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { CustomUiComponent } from 'meta/worlds';
import { GamePhase } from '../Types';
import { TOTAL_SHOTS } from '../Constants';
import {
  ShotFiredEvent, ShotFiredPayload,
  PhaseChangedEvent, PhaseChangedPayload,
  ScoreChangedEvent, ScoreChangedPayload,
  GameResetEvent, GameResetPayload,
} from '../Events/GameEvents';

@uiViewModel()
class SoccerKickHudViewModel extends UiViewModel {
  ScoreText: string = '0';
  Shot1Active: boolean = true;
  Shot2Active: boolean = true;
  Shot3Active: boolean = true;
  Shot4Active: boolean = true;
  Shot5Active: boolean = true;
  Shot6Active: boolean = true;
  ComboText: string = '';
  ComboVisible: boolean = false;
  InstructionText: string = '';
  InstructionVisible: boolean = false;
}

@component()
export class SoccerKickHudComponent extends Component {
  private _viewModel: SoccerKickHudViewModel = new SoccerKickHudViewModel();
  private _customUi: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._customUi = this.entity.getComponent(CustomUiComponent);
    if (this._customUi) {
      this._customUi.dataContext = this._viewModel;
    }
    this._updateDots(TOTAL_SHOTS);
  }

  // ── Shot fired → dim a dot immediately ───────────────────────────────────────

  @subscribe(ShotFiredEvent)
  onShotFired(p: ShotFiredPayload): void {
    this._updateDots(p.shotsLeft);
  }

  // ── Score / combo changed ────────────────────────────────────────────────────

  @subscribe(ScoreChangedEvent)
  onScoreChanged(p: ScoreChangedPayload): void {
    this._viewModel.ScoreText = `${p.score}`;
    const showCombo = p.comboMulti > 1;
    this._viewModel.ComboVisible = showCombo;
    this._viewModel.ComboText = showCombo ? `x${p.comboMulti}` : '';
  }

  // ── Phase changed → instruction text ─────────────────────────────────────────

  @subscribe(PhaseChangedEvent)
  onPhaseChanged(p: PhaseChangedPayload): void {
    if (p.phase === GamePhase.Aim) {
      this._viewModel.InstructionText = 'Swipe to shoot';
      this._viewModel.InstructionVisible = true;
    } else if (p.phase === GamePhase.GameOver) {
      this._viewModel.InstructionText = 'Tap to play again';
      this._viewModel.InstructionVisible = true;
    } else {
      this._viewModel.InstructionVisible = false;
    }
  }

  // ── Game reset → restore everything ──────────────────────────────────────────

  @subscribe(GameResetEvent)
  onGameReset(p: GameResetPayload): void {
    this._viewModel.ScoreText = '0';
    this._viewModel.ComboVisible = false;
    this._viewModel.ComboText = '';
    this._updateDots(p.shotsLeft);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private _updateDots(shotsLeft: number): void {
    this._viewModel.Shot1Active = shotsLeft >= 1;
    this._viewModel.Shot2Active = shotsLeft >= 2;
    this._viewModel.Shot3Active = shotsLeft >= 3;
    this._viewModel.Shot4Active = shotsLeft >= 4;
    this._viewModel.Shot5Active = shotsLeft >= 5;
    this._viewModel.Shot6Active = shotsLeft >= 6;
  }
}
