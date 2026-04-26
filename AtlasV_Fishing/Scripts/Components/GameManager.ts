import {
  Component,
  EventService,
  NetworkingService,
  OnEntityStartEvent,
  OnPlayerCreateEvent,
  type OnPlayerCreateEventPayload,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  component,
  subscribe,
} from 'meta/worlds';

import { RESET_DELAY } from '../Constants';
import { Events, GamePhase } from '../Types';
import { PlayerProgressService } from '../Services/PlayerProgressService';
import { GoldExplosionPool } from '../Services/GoldExplosionPool';
import { GoldCoinsDebugService } from '../Services/GoldCoinsDebugService';

// =============================================================================
//  GameManager — phase orchestrator.
//
//  Idle →(tap)→ Throwing →(auto)→ Diving →(auto)→ Surfacing →(auto)→ Launching →(auto)→ Reset → Idle
//
//  HookController drives Throwing→Diving, Diving→Surfacing, Surfacing→Launching.
//  GameManager handles: Idle→Throwing (tap), Launching→Reset, Reset→Idle (timer).
// =============================================================================

@component()
export class GameManager extends Component {

  private _networking = NetworkingService.get();
  private _goldexplosion = GoldExplosionPool.get();
  private _goldCoinsDebug = GoldCoinsDebugService.get();
  private _isServer   = true;

  private _phase      : GamePhase = GamePhase.Idle;
  private _resetTimer = 0;

  // ── Init ──────────────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    this._isServer = this._networking.isServerContext();
    if (this._isServer) return;
    EventService.sendLocally(Events.GameStarted, {});
    this._setPhase(GamePhase.Idle);
  }

  @subscribe(OnPlayerCreateEvent)
  onPlayerCreate(p: OnPlayerCreateEventPayload): void {
    if (!p.entity || !this._isServer) return;
    PlayerProgressService.get().loadForPlayer(p.entity);
  }

  // ── Cast request (from UI button) ──────────────────────────────────────

  @subscribe(Events.CastRequested)
  onCastRequested(_p: Events.CastRequestedPayload): void {
    if (this._isServer) return;
    if (this._phase === GamePhase.Idle) {
this._setPhase(GamePhase.Throwing);
    }
  }

  // ── HookController requests ───────────────────────────────────────────────────

  @subscribe(Events.RequestDiving)
  onRequestDiving(_p: Events.RequestDivingPayload): void {
    if (this._isServer) return;
    if (this._phase === GamePhase.Throwing) this._setPhase(GamePhase.Diving);
  }

  @subscribe(Events.RequestSurface)
  onRequestSurface(_p: Events.RequestSurfacePayload): void {
    if (this._isServer) return;
    if (this._phase === GamePhase.Diving) this._setPhase(GamePhase.Surfacing);
  }

  @subscribe(Events.RequestLaunch)
  onRequestLaunch(_p: Events.RequestLaunchPayload): void {
    if (this._isServer) return;
    if (this._phase === GamePhase.Surfacing) this._setPhase(GamePhase.Launching);
  }

  // ── End of run ────────────────────────────────────────────────────────────────

  @subscribe(Events.AllFishCollected)
  onAllFishCollected(_p: Events.AllFishCollectedPayload): void {
    if (this._isServer) return;
    this._setPhase(GamePhase.Reset);
    this._resetTimer = RESET_DELAY;
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (this._isServer) return;
    if (this._phase !== GamePhase.Reset) return;
    this._resetTimer -= p.deltaTime;
    if (this._resetTimer <= 0) {
      this._setPhase(GamePhase.Idle);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private _setPhase(phase: GamePhase): void {
    this._phase = phase;
    EventService.sendLocally(Events.PhaseChanged, { phase });
  }
}
