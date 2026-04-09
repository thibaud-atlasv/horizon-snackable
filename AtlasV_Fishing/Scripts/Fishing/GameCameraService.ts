import {
  CameraComponent,
  CameraMode,
  CameraService,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  Quaternion,
  Service,
  TransformComponent,
  Vec3,
  service,
  subscribe,
  type Entity,
} from 'meta/worlds';

import { HALF_SCREEN_WORLD_HEIGHT } from '../Constants';
import { Events } from '../Types';
import { ZoneProgressionService } from '../Fish/ZoneProgressionService';

// =============================================================================
//  GameCameraService — single source of truth for all camera positioning.
//
//  Centralises three concerns so they compose correctly:
//    1. Base pose   — set once by ClientSetup via registerCamera()
//    2. Scroll      — bait Y drives a vertical offset (zone-clamped)
//    3. Shake       — triggered via startShake(duration, amplitude)
//
//  All three are summed in _applyCamera() on every change.
//
//  ── Usage ────────────────────────────────────────────────────────────────────
//  ClientSetup:        GameCameraService.get().registerCamera(cameraEntity);
//  ImpactFxController: GameCameraService.get().startShake(duration, amplitude);
// =============================================================================

@service()
export class GameCameraService extends Service {

  // ── Base pose (set by registerCamera) ────────────────────────────────────────
  private _basePosX = 0;
  private _basePosY = 0;
  private _basePosZ = 0;
  private _baseRot!: Quaternion;
  private _fov      = 60;
  private _ready    = false;

  // ── Scroll ───────────────────────────────────────────────────────────────────
  private _scrollOffsetY = 0;
  private _scrollTargetY = 0;
  // Speed at which the camera lerps toward the scroll target (units/s feel — higher = snappier)
  private readonly _scrollLerpSpeed = 3.0;

  // ── Shake ────────────────────────────────────────────────────────────────────
  private _shakeTimer     = 0;
  private _shakeDuration  = 0;
  private _shakeAmplitude = 0;
  private _shakeOffsetX   = 0;
  private _shakeOffsetY   = 0;

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Called once by ClientSetup after the scene starts.
   * Reads the camera entity's world transform and FOV, then locks the camera.
   */
  registerCamera(entity: Entity): void {
    const tc = entity.getComponent(TransformComponent);
    if (!tc) return;
    this._basePosX = tc.worldPosition.x;
    this._basePosY = tc.worldPosition.y;
    this._basePosZ = tc.worldPosition.z;
    this._baseRot  = tc.worldRotation;

    const cc = entity.getComponent(CameraComponent);
    if (cc) this._fov = cc.fieldOfView;

    this._ready = true;
    this._applyCamera();
  }

  /**
   * Triggers a positional camera shake.
   * The shake fades linearly over `duration` seconds.
   */
  startShake(duration: number, amplitude: number): void {
    this._shakeTimer     = duration;
    this._shakeDuration  = duration;
    this._shakeAmplitude = amplitude;
  }

  // ── Event Handlers ───────────────────────────────────────────────────────────

  @subscribe(Events.BaitMoved)
  private _onBaitMoved(p: Events.BaitMovedPayload): void {
    if (!this._ready) return;

    if (p.y >= this._basePosY) {
      this._scrollTargetY = 0;
    } else {
      const floorY  = ZoneProgressionService.get().getFloorY();
      const minCamY = floorY + HALF_SCREEN_WORLD_HEIGHT;
      const targetY = Math.max(minCamY, p.y);
      this._scrollTargetY = targetY - this._basePosY;
    }
  }

  @subscribe(OnWorldUpdateEvent)
  private _onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._ready) return;

    const dt = p.deltaTime;

    // Smooth scroll toward target
    const scrollDiff = this._scrollTargetY - this._scrollOffsetY;
    if (Math.abs(scrollDiff) > 0.001) {
      this._scrollOffsetY += scrollDiff * Math.min(1, this._scrollLerpSpeed * dt);
    } else {
      this._scrollOffsetY = this._scrollTargetY;
    }

    // Shake
    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
      if (this._shakeTimer <= 0) {
        this._shakeOffsetX = 0;
        this._shakeOffsetY = 0;
      } else {
        const amp = this._shakeAmplitude * (this._shakeTimer / this._shakeDuration);
        this._shakeOffsetX = (Math.random() * 2 - 1) * amp;
        this._shakeOffsetY = (Math.random() * 2 - 1) * amp;
      }
    }

    this._applyCamera();
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _applyCamera(): void {
    CameraService.get().setCameraMode(CameraMode.Fixed, {
      position: new Vec3(
        this._basePosX + this._shakeOffsetX,
        this._basePosY + this._scrollOffsetY + this._shakeOffsetY,
        this._basePosZ,
      ),
      rotation: this._baseRot,
      duration: 0,
      fov:      this._fov,
    });
  }
}
