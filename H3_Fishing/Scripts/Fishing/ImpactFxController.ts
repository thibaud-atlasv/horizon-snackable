import {
  Color,
  ColorComponent,
  Component,
  NetworkingService,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  component,
  property,
  subscribe,
  type Entity,
  type Maybe,
} from 'meta/worlds';

import { Events } from '../Types';
import { GameCameraService } from './GameCameraService';

// =============================================================================
//  ImpactFxController
//
//  Plays a camera shake followed by a white flash when the bait hits the floor.
//  Camera shake is delegated to GameCameraService.
//  Flash is driven by a ColorComponent on a 3D plane placed in front of the camera.
//
//  ── Sequence ─────────────────────────────────────────────────────────────────
//  BaitHitBottom → shake starts → shake ends → flash (alpha 1→0 fade)
//
//  ── Editor setup ─────────────────────────────────────────────────────────────
//  Place on any persistent entity.
//  - flashPlaneEntity : 3D plane in front of the camera with a ColorComponent.
//                       Set its base color to white in the editor.
// =============================================================================

@component()
export class ImpactFxController extends Component {

  @property() flashPlaneEntity?: Entity;

  @property() shakeDuration  = 0.35;
  @property() shakeAmplitude = 0.08;
  @property() flashDuration  = 0.25;

  // ── State ────────────────────────────────────────────────────────────────────
  // Counts down from shakeDuration; flash starts only when it reaches 0
  private _flashDelayTimer = 0;
  private _flashTimer      = 0;
  private _flashCc: Maybe<ColorComponent> = null;

  // ── Init ─────────────────────────────────────────────────────────────────────
  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._flashCc = this.flashPlaneEntity?.getComponent(ColorComponent) ?? null;
    if (this._flashCc) this._flashCc.color = new Color(1, 1, 1, 0);
  }

  // ── Trigger ───────────────────────────────────────────────────────────────────
  @subscribe(Events.BaitHitBottom)
  private _onBaitHitBottom(_p: Events.BaitHitBottomPayload): void {
    GameCameraService.get().startShake(this.shakeDuration, this.shakeAmplitude);
    this._flashDelayTimer = this.shakeDuration;
    this._flashTimer      = 0;
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  @subscribe(OnWorldUpdateEvent)
  private _onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._tickFlash(p.deltaTime);
  }

  // ── Private ───────────────────────────────────────────────────────────────────
  private _tickFlash(dt: number): void {
    if (!this._flashCc) return;

    if (this._flashDelayTimer > 0) {
      this._flashDelayTimer -= dt;
      if (this._flashDelayTimer <= 0) {
        // Shake just ended — show flash at full opacity and start fade-out
        this._flashTimer = this.flashDuration;
        this._flashCc.color = new Color(1, 1, 1, 1);
      }
      return;
    }

    if (this._flashTimer <= 0) return;
    this._flashTimer -= dt;
    const alpha = Math.max(0, this._flashTimer / this.flashDuration);
    this._flashCc.color = new Color(1, 1, 1, alpha);
  }
}
