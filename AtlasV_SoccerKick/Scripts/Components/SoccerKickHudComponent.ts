import {
  Component, component, subscribe,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  ExecuteOn,
  UiViewModel,
  uiViewModel,
  NetworkingService,
  WorldService,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { CustomUiComponent } from 'meta/worlds';
import { GamePhase } from '../Types';
import { TOTAL_SHOTS } from '../Constants';
import {
  ShotFiredEvent, ShotFiredPayload,
  PhaseChangedEvent, PhaseChangedPayload,
  PointsReadyEvent, PointsReadyPayload,
  GameResetEvent, GameResetPayload,
} from '../Events/GameEvents';

// ── Dot animation constants ──────────────────────────────────────────
const EXPLOSION_DURATION = 0.25;   // seconds
const EXPLOSION_SCALE_END = 2.0;
const POPIN_DURATION = 0.40;       // seconds per dot
const POPIN_STAGGER = 0.10;        // seconds between dots
const POPIN_OPACITY_PHASE = 0.30;  // fraction of duration for opacity fade-in

enum DotAnimType {
  None = 0,
  Explosion = 1,
  PopIn = 2,
}

@uiViewModel()
class SoccerKickHudViewModel extends UiViewModel {
  ScoreText: string = '0';
  ScoreScale: number = 1;       // elastic bounce on score arrival
  ScoreColor: string = '#FFFFFFFF';  // flash gold on score arrival
  Shot1Active: boolean = true;
  Shot2Active: boolean = true;
  Shot3Active: boolean = true;
  Shot4Active: boolean = true;
  Shot5Active: boolean = true;
  Shot6Active: boolean = true;
  // Dot scale/opacity for animations
  Shot1Scale: number = 1;
  Shot2Scale: number = 1;
  Shot3Scale: number = 1;
  Shot4Scale: number = 1;
  Shot5Scale: number = 1;
  Shot6Scale: number = 1;
  Shot1Opacity: number = 1;
  Shot2Opacity: number = 1;
  Shot3Opacity: number = 1;
  Shot4Opacity: number = 1;
  Shot5Opacity: number = 1;
  Shot6Opacity: number = 1;
  InstructionText: string = '';
  InstructionVisible: boolean = false;
  InstructionOpacity: number = 1;
  InstructionTranslateY: number = 0;
}

@component()
export class SoccerKickHudComponent extends Component {
  private _viewModel: SoccerKickHudViewModel = new SoccerKickHudViewModel();
  private _customUi: Maybe<CustomUiComponent> = null;

  // Score roll-up state
  private _scoreRolling  = false;
  private _scoreElapsed  = 0;
  private _scoreFrom     = 0;
  private _scoreTo       = 0;
  private _scoreRollDur  = 0.55;  // count-up duration

  // Impact animation — elastic bounce + gold flash, triggered on PointsReady
  private _scoreImpacting    = false;
  private _scoreImpactElapsed = 0;
  private _scoreImpactDur    = 0.70;  // total impact anim duration

  // Per-dot animation state (indices 0..5 → Shot1..Shot6)
  private _dotAnimType:    number[] = [0, 0, 0, 0, 0, 0];
  private _dotAnimElapsed: number[] = [0, 0, 0, 0, 0, 0];
  private _dotAnimDelay:   number[] = [0, 0, 0, 0, 0, 0]; // stagger delay for pop-in

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._customUi = this.entity.getComponent(CustomUiComponent);
    if (this._customUi) {
      this._customUi.dataContext = this._viewModel;
    }
    this._updateDots(TOTAL_SHOTS);
    console.log('[SoccerKickHudComponent] Initialized with dot animations');
  }

  // ── Update: instruction bob + score roll-up + dot animations ───────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const dt = payload.deltaTime;

    if (this._viewModel.InstructionVisible) {
      const t = WorldService.get().getWorldTime();
      this._viewModel.InstructionTranslateY = Math.sin(t * 1.5) * 10;
    }

    if (this._scoreRolling) {
      this._scoreElapsed += dt;
      const p = Math.min(this._scoreElapsed / this._scoreRollDur, 1);
      const eased = this._easeOutExpo(p);
      this._viewModel.ScoreText = `${Math.round(this._scoreFrom + (this._scoreTo - this._scoreFrom) * eased)}`;
      if (p >= 1) {
        this._scoreRolling = false;
        this._viewModel.ScoreText = `${this._scoreTo}`;
      }
    }

    if (this._scoreImpacting) {
      this._scoreImpactElapsed += dt;
      const p = Math.min(this._scoreImpactElapsed / this._scoreImpactDur, 1);
      this._viewModel.ScoreScale = this._elasticImpact(p);
      this._viewModel.ScoreColor = this._goldFlash(p);
      if (p >= 1) {
        this._scoreImpacting = false;
        this._viewModel.ScoreScale = 1;
        this._viewModel.ScoreColor = '#FFFFFFFF';
      }
    }

    // Tick per-dot animations
    this._tickDotAnimations(dt);
  }

  // ── Shot fired → explosion on the consumed dot ─────────────────────

  @subscribe(ShotFiredEvent)
  onShotFired(p: ShotFiredPayload): void {
    // The dot that just went inactive is the rightmost active one.
    // shotsLeft is already decremented, so the consumed dot is at index shotsLeft.
    // e.g. 6 shots total, shotsLeft=5 → dot index 5 (rightmost) just consumed.
    const dotIndex = p.shotsLeft;
    if (dotIndex >= 0 && dotIndex < TOTAL_SHOTS) {
      this._startExplosion(dotIndex);
    }
    // Update active state (colors) — the exploding dot is also now inactive
    this._updateDots(p.shotsLeft);
  }

  // ── Points ready (casino drained) → start score roll-up + pulse ────

  @subscribe(PointsReadyEvent)
  onPointsReady(p: PointsReadyPayload): void {
    const prev = this._scoreTo;
    this._scoreFrom          = prev;
    this._scoreTo            = p.score;
    this._scoreElapsed       = 0;
    this._scoreRolling       = p.score !== prev;
    this._scoreImpactElapsed = 0;
    this._scoreImpacting     = p.score !== prev;
  }

  // ── Phase changed → instruction text ───────────────────────────────

  @subscribe(PhaseChangedEvent)
  onPhaseChanged(p: PhaseChangedPayload): void {
    if (p.phase === GamePhase.GameOver) {
      if (this._customUi) this._customUi.isVisible = false;
      return;
    }
    if (this._customUi) this._customUi.isVisible = true;
    if (p.phase === GamePhase.Aim) {
      this._viewModel.InstructionText = 'Swipe to shoot';
      this._viewModel.InstructionVisible = true;
    } else {
      this._viewModel.InstructionVisible = false;
    }
  }

  // ── Game reset → restore everything + pop-in animation ─────────────

  @subscribe(GameResetEvent)
  onGameReset(p: GameResetPayload): void {
    if (this._customUi) this._customUi.isVisible = true;
    this._scoreFrom          = 0;
    this._scoreTo            = 0;
    this._scoreRolling       = false;
    this._scoreImpacting     = false;
    this._scoreImpactElapsed = 0;
    this._viewModel.ScoreText  = '0';
    this._viewModel.ScoreScale = 1;
    this._viewModel.ScoreColor = '#FFFFFFFF';

    // Update dots first (sets all active = green colors)
    this._updateDots(p.shotsLeft);

    // Then start pop-in animation for all dots
    this._startPopIn();
  }

  // ── Dot Animation Helpers ──────────────────────────────────────────

  private _startExplosion(dotIndex: number): void {
    this._dotAnimType[dotIndex] = DotAnimType.Explosion;
    this._dotAnimElapsed[dotIndex] = 0;
    this._dotAnimDelay[dotIndex] = 0;
    // Start at current values (scale 1, opacity 1)
    this._setDotScale(dotIndex, 1);
    this._setDotOpacity(dotIndex, 1);
  }

  private _startPopIn(): void {
    for (let i = 0; i < TOTAL_SHOTS; i++) {
      this._dotAnimType[i] = DotAnimType.PopIn;
      this._dotAnimElapsed[i] = 0;
      this._dotAnimDelay[i] = i * POPIN_STAGGER;
      // Start hidden
      this._setDotScale(i, 0);
      this._setDotOpacity(i, 0);
    }
  }

  private _tickDotAnimations(dt: number): void {
    for (let i = 0; i < TOTAL_SHOTS; i++) {
      const animType = this._dotAnimType[i];
      if (animType === DotAnimType.None) continue;

      // Handle stagger delay
      if (this._dotAnimDelay[i] > 0) {
        this._dotAnimDelay[i] -= dt;
        if (this._dotAnimDelay[i] > 0) continue;
        // Absorb overshoot into elapsed
        this._dotAnimElapsed[i] = -this._dotAnimDelay[i];
        this._dotAnimDelay[i] = 0;
      } else {
        this._dotAnimElapsed[i] += dt;
      }

      if (animType === DotAnimType.Explosion) {
        this._tickExplosion(i);
      } else if (animType === DotAnimType.PopIn) {
        this._tickPopIn(i);
      }
    }
  }

  private _tickExplosion(i: number): void {
    const p = Math.min(this._dotAnimElapsed[i] / EXPLOSION_DURATION, 1);
    const eased = this._easeOutQuad(p);

    // Scale 1 → EXPLOSION_SCALE_END
    const scale = 1 + (EXPLOSION_SCALE_END - 1) * eased;
    // Opacity 1 → 0
    const opacity = 1 - eased;

    this._setDotScale(i, scale);
    this._setDotOpacity(i, opacity);

    if (p >= 1) {
      // Explosion done — restore to empty/inactive state (visible but inactive color)
      this._dotAnimType[i] = DotAnimType.None;
      this._setDotScale(i, 1);
      this._setDotOpacity(i, 1);
    }
  }

  private _tickPopIn(i: number): void {
    const p = Math.min(this._dotAnimElapsed[i] / POPIN_DURATION, 1);

    // Scale: elastic overshoot curve
    const scale = this._elasticPopIn(p);
    // Opacity: quick fade-in during first 30% of duration
    const opacityP = Math.min(p / POPIN_OPACITY_PHASE, 1);
    const opacity = this._easeOutQuad(opacityP);

    this._setDotScale(i, scale);
    this._setDotOpacity(i, opacity);

    if (p >= 1) {
      this._dotAnimType[i] = DotAnimType.None;
      this._setDotScale(i, 1);
      this._setDotOpacity(i, 1);
    }
  }

  // ── Dot Scale/Opacity Setters ──────────────────────────────────────

  private _setDotScale(index: number, value: number): void {
    switch (index) {
      case 0: this._viewModel.Shot1Scale = value; break;
      case 1: this._viewModel.Shot2Scale = value; break;
      case 2: this._viewModel.Shot3Scale = value; break;
      case 3: this._viewModel.Shot4Scale = value; break;
      case 4: this._viewModel.Shot5Scale = value; break;
      case 5: this._viewModel.Shot6Scale = value; break;
    }
  }

  private _setDotOpacity(index: number, value: number): void {
    switch (index) {
      case 0: this._viewModel.Shot1Opacity = value; break;
      case 1: this._viewModel.Shot2Opacity = value; break;
      case 2: this._viewModel.Shot3Opacity = value; break;
      case 3: this._viewModel.Shot4Opacity = value; break;
      case 4: this._viewModel.Shot5Opacity = value; break;
      case 5: this._viewModel.Shot6Opacity = value; break;
    }
  }

  // ── Shared Helpers ─────────────────────────────────────────────────

  private _updateDots(shotsLeft: number): void {
    this._viewModel.Shot1Active = shotsLeft >= 1;
    this._viewModel.Shot2Active = shotsLeft >= 2;
    this._viewModel.Shot3Active = shotsLeft >= 3;
    this._viewModel.Shot4Active = shotsLeft >= 4;
    this._viewModel.Shot5Active = shotsLeft >= 5;
    this._viewModel.Shot6Active = shotsLeft >= 6;
  }

  /**
   * Elastic impact curve for the score cartouche:
   *   0.0–0.15 : slam up   1.0 → 1.55  (fast punch)
   *   0.15–0.40: rebound   1.55 → 0.88 (overshoot low)
   *   0.40–0.60: bounce    0.88 → 1.12 (spring back)
   *   0.60–1.00: settle    1.12 → 1.00 (easeOut)
   */
  private _elasticImpact(t: number): number {
    if (t < 0.15) {
      return 1 + (t / 0.15) * 0.55;                          // 1.0 → 1.55
    } else if (t < 0.40) {
      const p = (t - 0.15) / 0.25;
      return 1.55 - p * 0.67;                                 // 1.55 → 0.88
    } else if (t < 0.60) {
      const p = (t - 0.40) / 0.20;
      return 0.88 + p * 0.24;                                 // 0.88 → 1.12
    } else {
      const p = (t - 0.60) / 0.40;
      return 1.12 - p * 0.12;                                 // 1.12 → 1.00
    }
  }

  /**
   * Elastic pop-in curve for dots (similar shape to _elasticImpact but from 0):
   *   0.0–0.25 : spring up  0 → 1.35  (fast overshoot)
   *   0.25–0.50: rebound    1.35 → 0.90
   *   0.50–0.75: bounce     0.90 → 1.08
   *   0.75–1.00: settle     1.08 → 1.00
   */
  private _elasticPopIn(t: number): number {
    if (t < 0.25) {
      const p = t / 0.25;
      return p * 1.35;                                         // 0 → 1.35
    } else if (t < 0.50) {
      const p = (t - 0.25) / 0.25;
      return 1.35 - p * 0.45;                                 // 1.35 → 0.90
    } else if (t < 0.75) {
      const p = (t - 0.50) / 0.25;
      return 0.90 + p * 0.18;                                 // 0.90 → 1.08
    } else {
      const p = (t - 0.75) / 0.25;
      return 1.08 - p * 0.08;                                 // 1.08 → 1.00
    }
  }

  /**
   * Interpolates hex color string from gold (#FFD700) to white (#FFFFFF).
   * Peaks gold at t=0, fully white by t=0.65.
   */
  private _goldFlash(t: number): string {
    const p  = Math.min(t / 0.65, 1);           // gold → white over first 65%
    const r  = 0xFF;
    const g  = Math.round(0xD7 + (0xFF - 0xD7) * p);  // 215 → 255
    const b  = Math.round(0x00 + 0xFF * p);             // 0   → 255
    const rh = r.toString(16).padStart(2, '0');
    const gh = g.toString(16).padStart(2, '0');
    const bh = b.toString(16).padStart(2, '0');
    return `#FF${rh}${gh}${bh}`;
  }

  private _easeOutExpo(t: number): number {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  private _easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }
}
