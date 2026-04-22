import {
  Component,
  EventService,
  NetworkingService,
  OnEntityStartEvent,
  component,
  subscribe,
} from 'meta/worlds';

import { ROUND_DEFS, totalObjCount } from '../LevelConfig';
import { Events, GamePhase, HUDEvents, LeaderboardEvents, NetworkEvents } from '../Types';
import { INTRO_DURATION_MS, TOTAL_ROUNDS } from '../Constants';
import { FallingObjService } from '../services/FallingObjService';
import { InputManager }      from '../services/InputManager';
import { SpawnManager }      from '../services/SpawnManager';

/**
 * GameManager — scene entry point and single source of truth for game state.
 *
 * Placed on a persistent scene entity. onStart() calls .get() on every
 * @service() so the SDK registers them all at startup, even if nothing else
 * imports them first.
 *
 * Tracks: current phase, round index, total score.
 * Owns all phase transitions.
 */
@component()
export class GameManager extends Component {

  private _phase:           GamePhase = GamePhase.Start;
  private _roundIndex:      number    = 0;
  private _totalScore:      number    = 0;
  private _roundTransTimer: ReturnType<typeof setTimeout> | null = null;
  private _activateTimer:   ReturnType<typeof setTimeout> | null = null;
  private _gameOverTimer:   ReturnType<typeof setTimeout> | null = null;
  private _phaseChangeTime: number    = 0;

  private static readonly TAP_LOCK_MS = 1500;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    // Force-register all services.
    FallingObjService.get();
    InputManager.get();
    SpawnManager.get();
    this._prepareRound(0);
    EventService.sendLocally(HUDEvents.UpdateScore, { score: 0 });
    EventService.sendLocally(HUDEvents.ShowMessage, { message: 'Tap to start' });
  }

  // ── Start screen / game-over tap ──────────────────────────────────────────

  @subscribe(Events.PlayerTap)
  onPlayerTap(_p: Events.PlayerTapPayload): void {
    if (this._phase === GamePhase.Start) {
      this._setPhase(GamePhase.Intro);
      this._startRound(INTRO_DURATION_MS);
    } else if (this._phase === GamePhase.GameOver || this._phase === GamePhase.End) {
      if (Date.now() - this._phaseChangeTime < GameManager.TAP_LOCK_MS) return;
      EventService.sendLocally(Events.Restart, {});
    }
  }

  // ── Score accumulation ────────────────────────────────────────────────────

  @subscribe(Events.FallingObjFrozen)
  onFallingObjFrozen(p: Events.FallingObjFrozenPayload): void {
    this._totalScore += p.pts;
    EventService.sendLocally(HUDEvents.UpdateScore, { score: this._totalScore });
  }

  // ── Round complete ────────────────────────────────────────────────────────

  @subscribe(Events.RoundComplete)
  onRoundComplete(_p: Events.RoundCompletePayload): void {
    this._cancelTimers();
    if (this._roundIndex + 1 >= TOTAL_ROUNDS) {
      this._roundTransTimer = setTimeout(() => this._showEnd(), 1000);
    } else {
      this._prepareRound(this._roundIndex + 1);
      this._setPhase(GamePhase.Intro);
    }
  }

  // ── Game over ─────────────────────────────────────────────────────────────

  @subscribe(Events.FallingObjHitFloor)
  onFallingObjHitFloor(_p: Events.FallingObjHitFloorPayload): void {
    if (this._phase === GamePhase.GameOver) return;
    this._cancelTimers();
    this._setPhase(GamePhase.GameOver);
    EventService.sendLocally(Events.GameOverShake, {});
    this._gameOverTimer = setTimeout(() => {
      this._gameOverTimer = null;
      EventService.sendLocally(HUDEvents.ShowMessage, { message: 'SPLAT  score ' + this._totalScore });
      EventService.sendLocally(LeaderboardEvents.ShowLeaderboard, { finalScore: this._totalScore, won: false });
    }, 1500);
  }

  // ── Restart ───────────────────────────────────────────────────────────────

  @subscribe(Events.Restart)
  onRestart(): void {
    if (this._phase !== GamePhase.GameOver && this._phase !== GamePhase.End) return;
    this._cancelTimers();
    this._totalScore = 0;
    EventService.sendLocally(HUDEvents.UpdateScore, { score: 0 });
    setTimeout(() => this._prepareRound(0), 300);
  }

  // ── All objects spawned → wait then start Falling ─────────────────────────

  @subscribe(Events.AllObjsSpawned)
  onAllObjsSpawned(_p: Events.AllObjsSpawnedPayload): void {
    if (this._roundIndex === 0) {
      this._setPhase(GamePhase.Start);
    } else {
      this._startRound(INTRO_DURATION_MS);
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private _prepareRound(index: number): void {
    this._cancelTimers();
    this._roundIndex = index;
    const count = totalObjCount(ROUND_DEFS[index]);
    EventService.sendLocally(HUDEvents.UpdateRound, { round: index + 1, objCount: count });
    EventService.sendLocally(Events.PrepareRound,    { roundIndex: index });
  }

  private _startRound(delayMs: number): void {
    this._roundTransTimer = setTimeout(() => {
      this._roundTransTimer = null;
      EventService.sendLocally(HUDEvents.HideMessage, {});
      this._setPhase(GamePhase.Falling);
    }, delayMs);
  }

  private _showEnd(): void {
    this._setPhase(GamePhase.End);
    EventService.sendLocally(HUDEvents.ShowMessage, { message: 'Final score  ' + this._totalScore });
    EventService.sendLocally(LeaderboardEvents.ShowLeaderboard, { finalScore: this._totalScore, won: true });
  }

  private _setPhase(phase: GamePhase): void {
    this._phase = phase;
    if (phase === GamePhase.GameOver || phase === GamePhase.End) {
      this._phaseChangeTime = Date.now();
    }
    EventService.sendLocally(Events.PhaseChanged, { phase });

    if (phase === GamePhase.Falling) {
      this._scheduleNextActivation(0);
    }
  }

  private _scheduleNextActivation(delayMs: number): void {
    this._activateTimer = setTimeout(() => {
      this._activateTimer = null;
      const obj = FallingObjService.get().getWaitingFallingObj();
      if (obj) {
        EventService.sendLocally(Events.FallingObjActivate, { objId: obj.objId });
        this._scheduleNextActivation(1000);
      }
    }, delayMs);
  }

  private _cancelTimers(): void {
    if (this._roundTransTimer !== null) {
      clearTimeout(this._roundTransTimer);
      this._roundTransTimer = null;
    }
    if (this._activateTimer !== null) {
      clearTimeout(this._activateTimer);
      this._activateTimer = null;
    }
    if (this._gameOverTimer !== null) {
      clearTimeout(this._gameOverTimer);
      this._gameOverTimer = null;
    }
  }
}
