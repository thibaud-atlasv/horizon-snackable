/**
 * CameraShakeService — Applies camera shake when a life is lost.
 *
 * init(cameraEntity): caches the camera anchor's TransformComponent.
 * shake(intensity, duration): triggers a decaying random offset shake.
 * Subscribes to EnemyReachedEnd → shake(0.15, 0.3) for a short punchy shake.
 * Subscribes to OnWorldUpdateEvent → applies per-frame random X/Y offset, decaying over duration.
 *
 * Entirely client-side. No networking concerns.
 */
import {
  Service, service, subscribe,
  TransformComponent, Vec3, WorldService,
  OnWorldUpdateEvent,
} from 'meta/worlds';
import type { Entity, Maybe, OnWorldUpdateEventPayload } from 'meta/worlds';
import { Events } from '../Types';

const VERBOSE_LOG = false;

@service()
export class CameraShakeService extends Service {

  private _transform: Maybe<TransformComponent> = null;
  private _originalPos: Vec3 = Vec3.zero;

  private _shaking: boolean = false;
  private _shakeIntensity: number = 0;
  private _shakeDuration: number = 0;
  private _shakeEnd: number = 0;

  // ── Public API ────────────────────────────────────────────────────

  /** Call once from ClientSetup after camera is initialised. */
  init(cameraEntity: Entity): void {
    this._transform = cameraEntity.getComponent(TransformComponent);
    if (!this._transform) return;
    this._originalPos = this._transform.localPosition;
  }

  /** Trigger a shake. intensity = max offset in world units, duration in seconds. */
  shake(intensity: number, duration: number): void {
    if (!this._transform) {
      if (VERBOSE_LOG) console.log('[CameraShakeService] shake() called before init, ignoring');
      return;
    }
    // Always store the current original pos when not already shaking
    // so stacked shakes don't drift
    if (!this._shaking) {
      this._originalPos = this._transform.localPosition;
    }
    this._shakeIntensity = intensity;
    this._shakeDuration = duration;
    this._shakeEnd = WorldService.get().getWorldTime() + duration;
    this._shaking = true;
    if (VERBOSE_LOG) console.log(`[CameraShakeService] Shake started: intensity=${intensity}, duration=${duration}`);
  }

  // ── Event handlers ────────────────────────────────────────────────

  @subscribe(Events.BallLost)
  onBallLost(_p: Events.BallLostPayload): void {
    this.shake(0.15, 0.3);
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(_p: OnWorldUpdateEventPayload): void {
    if (!this._shaking || !this._transform) return;

    const now = WorldService.get().getWorldTime();
    const remaining = this._shakeEnd - now;

    if (remaining <= 0) {
      // Shake finished — restore exact original position
      this._transform.localPosition = this._originalPos;
      this._shaking = false;
      if (VERBOSE_LOG) console.log('[CameraShakeService] Shake ended, position restored');
      return;
    }

    // Decaying factor: 1 at start → 0 at end
    const factor = remaining / this._shakeDuration;
    const range = this._shakeIntensity * factor;

    // Random offset on X and Y only (Z would look like zoom)
    const offsetX = (Math.random() * 2 - 1) * range;
    const offsetY = (Math.random() * 2 - 1) * range;

    this._transform.localPosition = this._originalPos.add(new Vec3(offsetX, offsetY, 0));
  }
}
