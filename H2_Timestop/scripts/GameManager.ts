import {
  Component,
  EventService,
  NetworkingService,
  OnEntityStartEvent,
  component,
  subscribe,
} from 'meta/worlds';
import { FallingObjRegistry } from './LogRegistry';
import { ROUND_DEFS, totalObjCount } from './LevelConfig';
import { Events, GamePhase, HUDEvents } from './Types';
import { TOTAL_ROUNDS } from './Constants';

/**
 * GameManager — single source of truth for game state.
 *
 * Tracks: current phase, round index, total score.
 * Owns all phase transitions; no other component should change phase directly
 * except InputManager (Falling ↔ Clearing) and GameManager.
 */
@component()
export class GameManager extends Component {

  private _phase:           GamePhase = GamePhase.Start;
  private _roundIndex:      number    = 0;
  private _totalScore:      number    = 0;
  private _roundTransTimer: ReturnType<typeof setTimeout> | null = null;
  private _activateTimer:   ReturnType<typeof setTimeout> | null = null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._prepareRound(0);
    EventService.sendLocally(HUDEvents.UpdateScore, { score: 0 });
    EventService.sendLocally(HUDEvents.ShowMessage, { message: 'Tap to start' });
  }

  // ── Start screen / game-over tap ──────────────────────────────────────────

  @subscribe(Events.PlayerTap)
  onPlayerTap(_p: Events.PlayerTapPayload): void {
    if (this._phase === GamePhase.Start) {
      this._startRound(0);
    } else if (this._phase === GamePhase.GameOver || this._phase === GamePhase.End) {
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
      this._setPhase(GamePhase.Intro);
      this._roundTransTimer = setTimeout(() => this._prepareRound(this._roundIndex + 1), 900);
    }
  }

  // ── Game over ─────────────────────────────────────────────────────────────

  @subscribe(Events.FallingObjHitFloor)
  onFallingObjHitFloor(): void {
    if (this._phase === GamePhase.GameOver) return;
    this._cancelTimers();
    this._setPhase(GamePhase.GameOver);
    EventService.sendLocally(HUDEvents.ShowMessage, { message: 'SPLAT  score ' + this._totalScore });
  }

  // ── Restart ───────────────────────────────────────────────────────────────

  @subscribe(Events.Restart)
  onRestart(): void {
    if (this._phase !== GamePhase.GameOver && this._phase !== GamePhase.End) return;
    this._cancelTimers();
    this._totalScore = 0;
    FallingObjRegistry.get().dispose();
    EventService.sendLocally(HUDEvents.UpdateScore, { score: 0 });
    setTimeout(() => this._prepareRound(0), 300);
  }

  // ── All objects spawned → wait then start Falling ─────────────────────────

  @subscribe(Events.AllObjsSpawned)
  onAllObjsSpawned(_p: Events.AllObjsSpawnedPayload): void {
    if (this._roundIndex === 0) {
      this._setPhase(GamePhase.Start);
    } else {
      this._startRound(1050);
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private _prepareRound(index: number): void {
    this._cancelTimers();
    this._roundIndex = index;
    const count = totalObjCount(ROUND_DEFS[index]);
    EventService.sendLocally(HUDEvents.UpdateRound, { round: index + 1, objCount: count });
    EventService.sendLocally(HUDEvents.ShowMessage,  { message: 'Round ' + (index + 1) });
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
  }

  private _setPhase(phase: GamePhase): void {
    this._phase = phase;
    EventService.sendLocally(Events.PhaseChanged, { phase });

    if (phase === GamePhase.Falling) {
      this._scheduleNextActivation(0);
    }
  }

  private _scheduleNextActivation(delayMs: number): void {
    this._activateTimer = setTimeout(() => {
      this._activateTimer = null;
      const obj = FallingObjRegistry.get().getWaitingFallingObj();
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
  }
}
