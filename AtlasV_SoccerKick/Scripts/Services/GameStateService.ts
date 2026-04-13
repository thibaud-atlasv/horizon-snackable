import { Service, service, EventService } from 'meta/worlds';
import { GamePhase, ShotOutcome } from '../Types';
import type { IGameSnapshot } from '../Types';
import {
  TOTAL_SHOTS, COMBO_THRESHOLD, MAX_COMBO_MULTI,
  PTS_GOAL, PTS_CORNER_MULTI, CORNER_THRESHOLD,
  GOAL_HALF_W,
} from '../Constants';
import {
  ShotFiredEvent, PhaseChangedEvent,
  ScoreChangedEvent, GameResetEvent,
} from '../Events/GameEvents';

@service()
export class GameStateService extends Service {

  // ── State ────────────────────────────────────────────────────────────────────

  private _phase:      GamePhase = GamePhase.Start;
  private _score:      number = 0;
  private _shotsLeft:  number = TOTAL_SHOTS;
  private _goals:      number = 0;
  private _combo:      number = 0;
  private _bestCombo:  number = 0;
  private _comboMulti: number = 1;

  // ── Getters ──────────────────────────────────────────────────────────────────

  get phase(): GamePhase { return this._phase; }
  get score(): number    { return this._score; }
  get shotsLeft(): number { return this._shotsLeft; }
  get comboMulti(): number { return this._comboMulti; }

  snapshot(): IGameSnapshot {
    const totalShots = TOTAL_SHOTS - this._shotsLeft;
    return {
      score:      this._score,
      shotsLeft:  this._shotsLeft,
      goals:      this._goals,
      combo:      this._combo,
      bestCombo:  this._bestCombo,
      comboMulti: this._comboMulti,
      accuracy:   totalShots > 0 ? this._goals / totalShots : 0,
    };
  }

  // ── Phase transitions ────────────────────────────────────────────────────────

  setPhase(phase: GamePhase): void {
    this._phase = phase;
    EventService.sendLocally(PhaseChangedEvent, { phase: phase as number });
  }

  // ── Shot fired (called when ball is kicked, before outcome) ──────────────────

  /** Consume a shot immediately when kicked. Dots dim and count decrements. */
  notifyShotFired(): void {
    this._shotsLeft--;
    EventService.sendLocally(ShotFiredEvent, { shotsLeft: this._shotsLeft });
  }

  // ── Shot resolution ──────────────────────────────────────────────────────────

  resolveShot(outcome: ShotOutcome, ballX: number): number {
    let points = 0;

    if (outcome === ShotOutcome.Goal) {
      this._combo++;
      if (this._combo > this._bestCombo) this._bestCombo = this._combo;
      this._comboMulti = this._combo >= COMBO_THRESHOLD
        ? Math.min(this._combo, MAX_COMBO_MULTI)
        : 1;
      this._goals++;

      const isCorner = Math.abs(ballX) > GOAL_HALF_W * CORNER_THRESHOLD;
      const multi = (isCorner ? PTS_CORNER_MULTI : 1) * this._comboMulti;
      points = Math.round(PTS_GOAL * multi);
      this._score += points;
    } else {
      this._combo = 0;
      this._comboMulti = 1;
    }

    return points;
  }

  /** Send ScoreChangedEvent with the current score state. Called by GameManager
   *  after ShotFeedbackResultEvent so the feedback display is already active. */
  broadcastScore(): void {
    EventService.sendLocally(ScoreChangedEvent, {
      score:      this._score,
      comboMulti: this._comboMulti,
    });
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  reset(): void {
    this._phase      = GamePhase.Aim;
    this._score      = 0;
    this._shotsLeft  = TOTAL_SHOTS;
    this._goals      = 0;
    this._combo      = 0;
    this._bestCombo  = 0;
    this._comboMulti = 1;

    EventService.sendLocally(GameResetEvent, { shotsLeft: TOTAL_SHOTS });
    EventService.sendLocally(PhaseChangedEvent, { phase: GamePhase.Aim as number });
  }
}
