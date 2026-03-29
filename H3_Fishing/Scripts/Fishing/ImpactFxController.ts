import {
  CameraComponent,
  CameraMode,
  CameraService,
  Color,
  ColorComponent,
  Component,
  NetworkingService,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  Quaternion,
  TransformComponent,
  Vec3,
  component,
  property,
  subscribe,
  type Entity,
  type Maybe,
} from 'meta/worlds';

import { Events } from '../Types';

// =============================================================================
//  ImpactFxController
//
//  Plays a camera shake and a white flash on a 3D plane when the bait hits
//  the ocean floor.
//
//  ── Listens ──────────────────────────────────────────────────────────────────
//  Events.BaitHitBottom → triggers shake + flash
//
//  ── Editor setup ─────────────────────────────────────────────────────────────
//  Place on any persistent entity (e.g. the rod or a dedicated FX entity).
//  - cameraAnchorEntity : entity whose world transform defines the camera's
//                         resting position/rotation (same entity used in
//                         ClientSetup to position the camera).
//  - flashPlaneEntity   : 3D plane in front of the camera with a ColorComponent.
//                         Set its base color to white in the editor; this
//                         component controls the alpha channel only.
// =============================================================================

@component()
export class ImpactFxController extends Component {

  // Entity that defines the camera resting pose (position + rotation)
  @property() cameraAnchorEntity?: Entity;

  // 3D plane in front of the camera — must have a ColorComponent
  @property() flashPlaneEntity?: Entity;

  // ── Derived from cameraAnchorEntity at start ──────────────────────────────────
  private _cameraFov = 60;

  // Shake settings
  @property() shakeDuration  = 0.35;
  @property() shakeAmplitude = 0.08;

  // Flash settings
  @property() flashDuration = 0.25;

  // ── State ────────────────────────────────────────────────────────────────────
  private _shakeTimer      = 0;
  // Counts down from shakeDuration; flash starts when it reaches 0
  private _flashDelayTimer = 0;
  private _flashTimer      = 0;

  private _camBasePos!: Vec3;
  private _camBaseRot!: Quaternion;
  private _flashCc?: Maybe<ColorComponent> = null;

  // ── Init ─────────────────────────────────────────────────────────────────────
  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    const anchorTc = this.cameraAnchorEntity?.getComponent(TransformComponent);
    if (anchorTc) {
      this._camBasePos = anchorTc.worldPosition;
      this._camBaseRot = anchorTc.worldRotation;
    }
    const camCc = this.cameraAnchorEntity?.getComponent(CameraComponent);
    if (camCc) this._cameraFov = camCc.fieldOfView;

    this._flashCc = this.flashPlaneEntity?.getComponent(ColorComponent);
    // Start fully transparent
    if (this._flashCc) this._flashCc.color = new Color(1, 1, 1, 0);
  }

  // ── Trigger ───────────────────────────────────────────────────────────────────
  @subscribe(Events.BaitHitBottom)
  private _onBaitHitBottom(_p: Events.BaitHitBottomPayload): void {
    this._shakeTimer      = this.shakeDuration;
    // Flash starts only after the shake completes
    this._flashDelayTimer = this.shakeDuration;
    this._flashTimer      = 0;
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  @subscribe(OnWorldUpdateEvent)
  private _onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const dt = p.deltaTime;

    this._tickShake(dt);
    this._tickFlash(dt);
  }

  // ── Private ───────────────────────────────────────────────────────────────────
  private _tickShake(dt: number): void {
    if (this._shakeTimer <= 0) return;

    this._shakeTimer -= dt;

    if (this._shakeTimer <= 0) {
      // Restore camera to its resting pose
      CameraService.get().setCameraMode(CameraMode.Fixed, {
        position: this._camBasePos,
        rotation: this._camBaseRot,
        duration: 0,
        fov: this._cameraFov,
      });
      return;
    }

    // Amplitude decreases linearly as the shake fades out
    const amp = this.shakeAmplitude * (this._shakeTimer / this.shakeDuration);
    const ox   = (Math.random() * 2 - 1) * amp;
    const oy   = (Math.random() * 2 - 1) * amp;

    CameraService.get().setCameraMode(CameraMode.Fixed, {
      position: new Vec3(this._camBasePos.x + ox, this._camBasePos.y + oy, this._camBasePos.z),
      rotation: this._camBaseRot,
      duration: 0,
      fov: this._cameraFov,
    });
  }

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
