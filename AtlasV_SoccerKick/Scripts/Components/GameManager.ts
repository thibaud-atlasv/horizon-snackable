import {
  Component, OnEntityStartEvent, OnWorldUpdateEvent,
  NetworkingService, WorldService, NetworkMode,
  Vec3, Quaternion,
  EventService,
  component, subscribe,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload, Maybe, Entity } from 'meta/worlds';
import { ShotFeedbackResultEvent } from '../Events/ShotFeedbackEvents';
import { GamePhase, ShotOutcome } from '../Types';
import {
  NEXT_SHOT_GOAL_MS, NEXT_SHOT_SAVE_MS, NEXT_SHOT_POST_MS, NEXT_SHOT_MISS_MS,
  GAME_OVER_DELAY,
} from '../Constants';
import { Assets } from '../Assets';
import { GameStateService } from '../Services/GameStateService';
import { BallService } from '../Services/BallService';
import { GoalkeeperService } from '../Services/GoalkeeperService';
import { VfxService } from '../Services/VfxService';

@component()
export class GameManager extends Component {

  private _ballEntity: Maybe<Entity> = null;
  private _gkEntity:   Maybe<Entity> = null;
  private _nextShotTimer: ReturnType<typeof setTimeout> | null = null;

  private _networkingService = NetworkingService.get();

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (this._networkingService.isServerContext()) return;
    this._spawnEntities();
  }

  private _spawnEntities(): void {
    const ws = WorldService.get();

    ws.spawnTemplate({
      templateAsset: Assets.Ball,
      position:  new Vec3(0, 0.28, 9.0),
      rotation:  Quaternion.identity,
      scale:     Vec3.one,
      networkMode: NetworkMode.LocalOnly,
    }).then(e => { this._ballEntity = e; }).catch(() => {});

    ws.spawnTemplate({
      templateAsset: Assets.Goalkeeper,
      position:  new Vec3(0, 0, 0.6),
      rotation:  Quaternion.identity,
      scale:     Vec3.one,
      networkMode: NetworkMode.LocalOnly,
    }).then(e => { this._gkEntity = e; }).catch(() => {});

    VfxService.get().prewarm().catch(() => {});

    // Start game immediately
    GameStateService.get().reset();
  }

  // ── Per-frame update ─────────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    const dt    = p.deltaTime;
    const state = GameStateService.get();
    const phase = state.phase;

    // Clear pending timers if game was reset (tap-to-restart)
    if (phase === GamePhase.Aim && this._nextShotTimer !== null) {
      clearTimeout(this._nextShotTimer);
      this._nextShotTimer = null;
    }

    // Always tick the GK (idle sway, reaction, dive)
    GoalkeeperService.get().tick(dt);

    // Tick ball physics when flying or in result bounce
    if (phase === GamePhase.Flying || phase === GamePhase.Result) {
      const ball = BallService.get();

      // Check GK save BEFORE advancing ball (avoid cycle: BallService ↔ GoalkeeperService)
      if (phase === GamePhase.Flying && ball.inGKZone) {
        if (GoalkeeperService.get().checkSave(ball.posX, ball.posY)) {
          ball.deflectSave();
          this._onShotResolved(ShotOutcome.Save);
          return;
        }
      }

      const outcome = ball.tick(phase, dt);

      if (outcome !== null && phase === GamePhase.Flying) {
        this._onShotResolved(outcome);
      }
    }
  }

  // ── Shot resolution ──────────────────────────────────────────────────────────

  private _onShotResolved(outcome: ShotOutcome): void {
    const state = GameStateService.get();
    state.setPhase(GamePhase.Result);
    const points = state.resolveShot(outcome, BallService.get().posX);

    // Fire feedback event so UI can display GOAL!/MISS!/SAVED!
    EventService.sendLocally(ShotFeedbackResultEvent, {
      outcome: outcome as number,
      pointsEarned: points,
    });

    const delay = this._outcomeDelay(outcome);
    this._nextShotTimer = setTimeout(() => this._nextShot(), delay);
  }

  private _outcomeDelay(outcome: ShotOutcome): number {
    switch (outcome) {
      case ShotOutcome.Goal:    return NEXT_SHOT_GOAL_MS;
      case ShotOutcome.Save:    return NEXT_SHOT_SAVE_MS;
      case ShotOutcome.PostHit: return NEXT_SHOT_POST_MS;
      case ShotOutcome.Miss:    return NEXT_SHOT_MISS_MS;
    }
  }

  private _nextShot(): void {
    this._nextShotTimer = null;
    const state = GameStateService.get();

    // shotsLeft was already decremented in notifyShotFired() at kick time
    if (state.shotsLeft <= 0) {
      setTimeout(() => {
        state.setPhase(GamePhase.GameOver);
      }, GAME_OVER_DELAY);
      return;
    }

    BallService.get().reset();
    GoalkeeperService.get().reset();
    state.setPhase(GamePhase.Aim);
  }

  // ── Restart (called externally, e.g. from UI) ─────────────────────────────

  restart(): void {
    if (this._nextShotTimer !== null) {
      clearTimeout(this._nextShotTimer);
      this._nextShotTimer = null;
    }
    BallService.get().reset();
    GoalkeeperService.get().reset();
    GameStateService.get().reset();
  }
}
