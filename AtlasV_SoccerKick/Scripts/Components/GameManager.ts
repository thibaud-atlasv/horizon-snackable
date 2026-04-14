import {
  Component, OnEntityStartEvent, OnWorldUpdateEvent,
  NetworkingService, WorldService, NetworkMode,
  Vec3, Quaternion,
  EventService,
  component, subscribe,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload, Maybe, Entity } from 'meta/worlds';
import { ShotFeedbackResultEvent } from '../Events/ShotFeedbackEvents';
import { GameResetEvent, GameResetPayload, KeeperDespawnEvent } from '../Events/GameEvents';
import { GamePhase, ShotOutcome } from '../Types';
import {
  NEXT_SHOT_GOAL_MS, NEXT_SHOT_SAVE_MS, NEXT_SHOT_POST_MS, NEXT_SHOT_MISS_MS,
  GAME_OVER_DELAY,
} from '../Constants';
import { Assets } from '../Assets';
import { KEEPER_DEFS } from '../Defs/KeeperDefs';
import { GameStateService } from '../Services/GameStateService';
import { BallService } from '../Services/BallService';
import { GoalkeeperService } from '../Services/GoalkeeperService';
import { VfxService } from '../Services/VfxService';
import { BallTrailService } from '../Services/BallTrailService';

@component()
export class GameManager extends Component {

  private _ballEntity: Maybe<Entity> = null;
  private _gkEntity:   Maybe<Entity> = null;
  private _nextShotTimer: ReturnType<typeof setTimeout> | null = null;
  private _keeperSpawned = false;
  private _lastKeeperIndex = -1;


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

    this._spawnRandomKeeper().catch(() => {});

    VfxService.get().prewarm().catch(() => {});
    BallTrailService.get().prewarm().catch(() => {});

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
    const ball = BallService.get();
    const { points, bonusZone } = state.resolveShot(outcome, ball.posX, ball.posY);

    // Fire feedback first — ShotFeedbackDisplayComponent must be active
    // before ScoreChangedEvent arrives so it can intercept and delay the HUD update.
    EventService.sendLocally(ShotFeedbackResultEvent, {
      outcome: outcome as number,
      pointsEarned: points,
      bonusZone,
    });

    // Broadcast score after feedback — ShotFeedbackDisplayComponent will now
    // see _casinoActive = true and hold the score until the roll-up completes.
    state.broadcastScore();

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

  // ── Keeper spawn ─────────────────────────────────────────────────────────────

  private async _spawnRandomKeeper(): Promise<void> {
    if (this._gkEntity) {
      EventService.sendLocally(KeeperDespawnEvent, {});
      this._gkEntity = null;
    }
    const count = KEEPER_DEFS.length;
    let index: number;
    if (this._lastKeeperIndex === -1) {
      index = Math.floor(Math.random() * count);
    } else {
      index = Math.floor(Math.random() * (count - 1));
      if (index >= this._lastKeeperIndex) index++;
    }
    this._lastKeeperIndex = index;
    const def = KEEPER_DEFS[index];
    GoalkeeperService.get().setDef(index);
    this._gkEntity = await WorldService.get().spawnTemplate({
      templateAsset: def.template,
      position:      new Vec3(0, 0, 0.6),
      rotation:      Quaternion.identity,
      scale:         Vec3.one,
      networkMode:   NetworkMode.LocalOnly,
    });
    this._keeperSpawned = true;
  }

  @subscribe(GameResetEvent)
  onGameReset(_p: GameResetPayload): void {
    if (this._networkingService.isServerContext()) return;
    // Skip the first reset fired by _spawnEntities() — keeper is already spawning
    if (!this._keeperSpawned) return;
    this._spawnRandomKeeper().catch(() => {});
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
