/**
 * CameraShakeService — Decaying random-offset camera shake on shot outcomes.
 *
 * init(cameraEntity): caches the camera anchor's TransformComponent.
 *   Call once from ClientSetup after the camera is initialised.
 * shake(intensity, duration): triggers a shake with intensity in world units.
 *
 * Subscribes to ShotFeedbackResultEvent:
 *   Goal    → strong shake (0.25, 0.5s)
 *   Save    → medium shake (0.12, 0.3s)
 *   PostHit → light shake  (0.10, 0.25s)
 *   Miss    → subtle shake (0.05, 0.15s)
 *
 * Entirely client-side. No networking concerns.
 */
import {
  Service, service, subscribe,
  TransformComponent, Vec3, WorldService,
  OnWorldUpdateEvent,
} from 'meta/worlds';
import type { Entity, Maybe, OnWorldUpdateEventPayload } from 'meta/worlds';
import { ShotFeedbackResultEvent, ShotFeedbackResultPayload } from '../Events/ShotFeedbackEvents';
import { ShotOutcome } from '../Types';
import {
  SHAKE_GOAL_INTENSITY, SHAKE_GOAL_DURATION,
  SHAKE_SAVE_INTENSITY, SHAKE_SAVE_DURATION,
  SHAKE_POST_INTENSITY, SHAKE_POST_DURATION,
  SHAKE_MISS_INTENSITY, SHAKE_MISS_DURATION,
} from '../Constants';

@service()
export class CameraShakeService extends Service {

  private _transform: Maybe<TransformComponent> = null;
  private _originalPos: Vec3 = Vec3.zero;

  private _shaking: boolean = false;
  private _shakeIntensity: number = 0;
  private _shakeDuration: number = 0;
  private _shakeEnd: number = 0;

  // ── Public API ────────────────────────────────────────────────────

  /** Call once from ClientSetup after the camera is initialised. */
  init(cameraEntity: Entity): void {
    this._transform = cameraEntity.getComponent(TransformComponent);
    if (!this._transform) return;
    this._originalPos = this._transform.localPosition;
  }

  /** Trigger a shake. intensity = max offset in world units, duration in seconds. */
  shake(intensity: number, duration: number): void {
    if (!this._transform) return;
    if (!this._shaking) {
      this._originalPos = this._transform.localPosition;
    }
    this._shakeIntensity = intensity;
    this._shakeDuration  = duration;
    this._shakeEnd       = WorldService.get().getWorldTime() + duration;
    this._shaking        = true;
  }

  // ── Event handlers ────────────────────────────────────────────────

  @subscribe(ShotFeedbackResultEvent)
  onShotResult(p: ShotFeedbackResultPayload): void {
    switch (p.outcome as ShotOutcome) {
      case ShotOutcome.Goal:    this.shake(SHAKE_GOAL_INTENSITY, SHAKE_GOAL_DURATION);  break;
      case ShotOutcome.Save:    this.shake(SHAKE_SAVE_INTENSITY, SHAKE_SAVE_DURATION);  break;
      case ShotOutcome.PostHit: this.shake(SHAKE_POST_INTENSITY, SHAKE_POST_DURATION);  break;
      case ShotOutcome.Miss:    this.shake(SHAKE_MISS_INTENSITY, SHAKE_MISS_DURATION);  break;
    }
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(_p: OnWorldUpdateEventPayload): void {
    if (!this._shaking || !this._transform) return;

    const now       = WorldService.get().getWorldTime();
    const remaining = this._shakeEnd - now;

    if (remaining <= 0) {
      this._transform.localPosition = this._originalPos;
      this._shaking = false;
      return;
    }

    // Decaying factor: 1 at start → 0 at end
    const factor = remaining / this._shakeDuration;
    const range  = this._shakeIntensity * factor;

    const offsetX = (Math.random() * 2 - 1) * range;
    const offsetY = (Math.random() * 2 - 1) * range;

    this._transform.localPosition = this._originalPos.add(new Vec3(offsetX, offsetY, 0));
  }
}
