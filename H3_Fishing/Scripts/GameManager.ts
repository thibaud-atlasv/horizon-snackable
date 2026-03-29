import {
  Component,
  EventService,
  NetworkingService,
  OnEntityStartEvent,
  OnFocusedInteractionInputEndedEvent,
  OnFocusedInteractionInputStartedEvent,
  type OnFocusedInteractionInputEventPayload,
  OnPlayerCreateEvent,
  type OnPlayerCreateEventPayload,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  component,
  subscribe,
  PlayerService,
} from 'meta/worlds';

import { PING_PONG_SPEED, RESET_DELAY } from './Constants';
import { Events, HUDEvents, GamePhase } from './Types';
import { FishRegistry } from './Fish/FishRegistry';
import { FishCollectionService } from './Fish/FishCollectionService';
import { FishSpawnService } from './Fish/FishSpawnService';
import { PlayerProgressService } from './PlayerProgressService';

// =============================================================================
//  GameManager
//
//  Game rules layer: phase state machine, catch logic.
//  All bait physics and rod visuals live in RodController.
//  Fish spawning is autonomous via FishSpawnService (zone-based).
//
//  ── Phase flow ───────────────────────────────────────────────────────────────
//  Idle  →(hold)→  Charging  →(release)→  Falling
//    ↑                                        ↓ FishHooked / BaitHitBottom
//    └── Reset ←── CatchDisplay ←── Reeling ──┘ (BaitSurfaced)
//
//  ── Editor setup ─────────────────────────────────────────────────────────────
//  Place this component on any persistent entity in the scene (e.g. GameRoot).
// =============================================================================

@component()
export class GameManager extends Component {

  // need to call it at least once
  private fishService = FishSpawnService.get();
  private progressionService = PlayerProgressService.get();
  // ── Phase ─────────────────────────────────────────────────────────────────────
  private _phase: GamePhase = GamePhase.Idle;

  // ── Charge ────────────────────────────────────────────────────────────────────
  private _chargeLevel = 0;
  private _chargeDir   = 1;

  // ── Timers ────────────────────────────────────────────────────────────────────
  private _resetTimer = 0;

  // ── Catch tracking ────────────────────────────────────────────────────────────
  private _hookedFishId = -1;
  private _hookedDefId  = 0;

  // ── Init ──────────────────────────────────────────────────────────────────────
  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log("player entity", PlayerService.get().getLocalPlayer());
    
    EventService.sendLocally(Events.GameStarted, {});
    this._setPhase(GamePhase.Idle);
  }

  @subscribe(OnPlayerCreateEvent)
  onPlayerCreate(p: OnPlayerCreateEventPayload): void {
    if (!p.entity) return;
    PlayerProgressService.get().loadForPlayer(p.entity);
  }

  // ── Input ─────────────────────────────────────────────────────────────────────
  @subscribe(OnFocusedInteractionInputStartedEvent)
  private _onTouchStart(_p: OnFocusedInteractionInputEventPayload): void {
    switch (this._phase) {
      case GamePhase.Idle:
        this._startCharge();
        break;
      case GamePhase.CatchDisplay:
        this._dismissCatch();
        break;
    }
  }

  @subscribe(OnFocusedInteractionInputEndedEvent)
  private _onTouchEnd(_p: OnFocusedInteractionInputEventPayload): void {
    if (this._phase === GamePhase.Charging) this._releaseCast();
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  @subscribe(OnWorldUpdateEvent)
  private _onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._tick(p.deltaTime);
  }

  private _tick(dt: number): void {
    switch (this._phase) {

      case GamePhase.Charging: {
        this._chargeLevel += this._chargeDir * PING_PONG_SPEED * dt;
        if (this._chargeLevel >= 1.0) { this._chargeLevel = 1.0; this._chargeDir = -1; }
        if (this._chargeLevel <= 0.0) { this._chargeLevel = 0.0; this._chargeDir =  1; }
        EventService.sendLocally(HUDEvents.UpdateGauge, { value: this._chargeLevel, mode: 'cast' });
        break;
      }

      case GamePhase.HitBottom: {
        this._resetTimer -= dt;
        if (this._resetTimer <= 0) {
          this._setPhase(GamePhase.Reset);
          this._resetTimer = 0.1;
        }
        break;
      }

      case GamePhase.Reset: {
        this._resetTimer -= dt;
        if (this._resetTimer <= 0) this._returnToIdle();
        break;
      }
    }
  }

  // ── Rod events ────────────────────────────────────────────────────────────────
  @subscribe(Events.BaitHitBottom)
  private _onBaitHitBottom(_p: Events.BaitHitBottomPayload): void {
    this._setPhase(GamePhase.HitBottom);
    this._resetTimer = RESET_DELAY;
  }

  @subscribe(Events.FishHooked)
  private _onFishHooked(p: Events.FishHookedPayload): void {
    this._hookedFishId = p.fishId;
    this._hookedDefId  = p.defId;
    this._setPhase(GamePhase.Reeling);
  }

  @subscribe(Events.BaitSurfaced)
  private _onBaitSurfaced(_p: Events.BaitSurfacedPayload): void {
    this._triggerCatch();
  }

  // ── Actions ───────────────────────────────────────────────────────────────────
  private _startCharge(): void {
    this._chargeLevel = 0;
    this._chargeDir   = 1;
    EventService.sendLocally(HUDEvents.UpdateGauge, { value: 0, mode: 'cast' });
    this._setPhase(GamePhase.Charging);
  }

  private _releaseCast(): void {
    EventService.sendLocally(Events.CastReleased, { chargeLevel: this._chargeLevel });
    EventService.sendLocally(HUDEvents.UpdateGauge, { value: 0, mode: 'cast' });
    this._setPhase(GamePhase.Falling);
  }

  private _triggerCatch(): void {
    if (this._hookedFishId < 0) return;
    const collection = FishCollectionService.get();
    const isNew      = !collection.hasCaught(this._hookedDefId);
    EventService.sendLocally(Events.FishCaught, { fishId: this._hookedFishId, defId: this._hookedDefId });
    EventService.sendLocally(HUDEvents.ShowCatch, {
      defId:      this._hookedDefId,
      isNew,
      catchCount: collection.getCount(this._hookedDefId),
    });
    this._setPhase(GamePhase.CatchDisplay);
  }

  @subscribe(HUDEvents.DismissCatch)
  private _dismissCatch(): void {
    EventService.sendLocally(HUDEvents.HideCatch, {});
    FishRegistry.get().destroyFish(this._hookedFishId);
    this._hookedFishId = -1;
    this._hookedDefId  = 0;
    this._setPhase(GamePhase.Reset);
    this._resetTimer = 0.2;
  }

  private _returnToIdle(): void {
    this._setPhase(GamePhase.Idle);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  private _setPhase(phase: GamePhase): void {
    this._phase = phase;
    EventService.sendLocally(Events.PhaseChanged, { phase });
  }
}
