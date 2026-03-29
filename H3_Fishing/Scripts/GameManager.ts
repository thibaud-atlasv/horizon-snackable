import {
  Component,
  EventService,
  NetworkingService,
  OnEntityStartEvent,
  OnFocusedInteractionInputEndedEvent,
  OnFocusedInteractionInputStartedEvent,
  type OnFocusedInteractionInputEventPayload,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  component,
  subscribe,
} from 'meta/worlds';

import {
  PING_PONG_SPEED,
  RESET_DELAY,
  FISH_PER_WAVE, WAVE_SPEED_MAX, WAVE_SPEED_STEP,
} from './Constants';
import { Events, HUDEvents, GamePhase } from './Types';
import { FishRegistry } from './Fish/FishRegistry';
import { FishSpawnService } from './Fish/FishSpawnService';
import { FishCollectionService } from './Fish/FishCollectionService';

// =============================================================================
//  GameManager
//
//  Game rules layer: phase state machine, wave progression, catch logic.
//  All bait physics and rod visuals live in RodController.
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

  // ── Phase ─────────────────────────────────────────────────────────────────────
  private _phase: GamePhase = GamePhase.Idle;

  // ── Charge ────────────────────────────────────────────────────────────────────
  private _chargeLevel = 0;
  private _chargeDir   = 1;

  // ── Timers ────────────────────────────────────────────────────────────────────
  private _resetTimer = 0;

  // ── Wave ──────────────────────────────────────────────────────────────────────
  private _waveSpeedMul = 1.0;
  private _waveIndex    = 0;

  // ── Catch tracking ────────────────────────────────────────────────────────────
  private _hookedFishId = -1;

  // ── Init ──────────────────────────────────────────────────────────────────────
  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._spawnWave();
    this._setPhase(GamePhase.Idle);
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
    const fishId     = this._hookedFishId;
    const collection = FishCollectionService.get();
    const isNew      = !collection.hasCaught(fishId);
    // FishCaught triggers FishCollectionService.recordCatch and the fish entity destroy
    EventService.sendLocally(Events.FishCaught, { fishId });
    EventService.sendLocally(HUDEvents.ShowCatch, {
      fishId,
      isNew,
      catchCount: collection.getCount(fishId),
    });
    this._setPhase(GamePhase.CatchDisplay);
  }

  @subscribe(HUDEvents.DismissCatch)
  private _dismissCatch(): void {
    EventService.sendLocally(HUDEvents.HideCatch, {});
    FishRegistry.get().destroyFish(this._hookedFishId);
    this._hookedFishId = -1;
    this._setPhase(GamePhase.Reset);

    if (FishRegistry.get().activeCount === 0) {
      this._resetTimer   = 0.5;
      this._waveSpeedMul = Math.min(WAVE_SPEED_MAX, this._waveSpeedMul + WAVE_SPEED_STEP);
    } else {
      this._resetTimer = 0.2;
    }
  }

  private _returnToIdle(): void {
    if (FishRegistry.get().activeCount === 0) this._spawnWave();
    this._setPhase(GamePhase.Idle);
  }

  private _spawnWave(): void {
    FishSpawnService.get().spawnWave(FISH_PER_WAVE, this._waveSpeedMul);
    EventService.sendLocally(Events.WaveStart, {
      waveIndex:       this._waveIndex,
      speedMultiplier: this._waveSpeedMul,
    });
    this._waveIndex++;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  private _setPhase(phase: GamePhase): void {
    this._phase = phase;
    EventService.sendLocally(Events.PhaseChanged, { phase });
  }

  @subscribe(Events.Restart)
  private _onRestart(_p: Events.RestartPayload): void {
    this._phase        = GamePhase.Idle;
    this._chargeLevel  = 0;
    this._hookedFishId = -1;
    this._waveSpeedMul = 1.0;
    this._waveIndex    = 0;
    this._spawnWave();
    this._setPhase(GamePhase.Idle);
  }
}
