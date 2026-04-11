/**
 * JuiceService — Centralized game-feel effects.
 *
 * Handles:
 * - Hit freeze (brief time pause on impacts)
 * - Extended camera shake (variable intensity per event)
 * - Enhanced particles (paddle sparks, brick crack particles)
 *
 * Subscribes to BrickHit, BrickDestroyed, PaddleHit, ExplosionChain, BallLost.
 * Entirely client-side.
 */
import {
  Service, service, subscribe,
  OnWorldUpdateEvent, ExecuteOn,
  Vec3, Color,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { Events } from '../Types';
import {
  FREEZE_BRICK_HIT, FREEZE_BRICK_DESTROY, FREEZE_EXPLOSION, FREEZE_BALL_LOST,
  SHAKE_BRICK_HIT, SHAKE_BRICK_DESTROY, SHAKE_PADDLE_HIT, SHAKE_EXPLOSION, SHAKE_BALL_LOST,
  PADDLE_SPARK_COUNT, BRICK_CRACK_COUNT,
} from '../Constants';
import { CameraShakeService } from './CameraShakeService';
import { VfxService } from './VfxService';

@service()
export class JuiceService extends Service {
  private _freezeUntil: number = 0;
  private _isFrozen: boolean = false;

  /** Returns true if the game should skip physics this frame. */
  get frozen(): boolean { return this._isFrozen; }

  // ── Hit Freeze ─────────────────────────────────────────────────────────────

  private _freeze(duration: number): void {
    const until = Date.now() + duration * 1000;
    if (until > this._freezeUntil) this._freezeUntil = until;
    this._isFrozen = true;
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  private _onUpdate(_p: OnWorldUpdateEventPayload): void {
    if (this._isFrozen && Date.now() >= this._freezeUntil) {
      this._isFrozen = false;
    }
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  @subscribe(Events.BrickHit, { execution: ExecuteOn.Owner })
  private _onBrickHit(p: Events.BrickHitPayload): void {
    this._freeze(FREEZE_BRICK_HIT);
    CameraShakeService.get().shake(SHAKE_BRICK_HIT.intensity, SHAKE_BRICK_HIT.duration);
    this._spawnCrackParticles(p.position, p.color);
  }

  @subscribe(Events.BrickDestroyed, { execution: ExecuteOn.Owner })
  private _onBrickDestroyed(p: Events.BrickDestroyedPayload): void {
    this._freeze(FREEZE_BRICK_DESTROY);
    CameraShakeService.get().shake(SHAKE_BRICK_DESTROY.intensity, SHAKE_BRICK_DESTROY.duration);
    // VfxService already spawns death particles via its own BrickDestroyed subscriber
  }

  @subscribe(Events.PaddleHit, { execution: ExecuteOn.Owner })
  private _onPaddleHit(p: Events.PaddleHitPayload): void {
    CameraShakeService.get().shake(SHAKE_PADDLE_HIT.intensity, SHAKE_PADDLE_HIT.duration);
    this._spawnPaddleSparks(p.position, p.ballVelocityX, p.ballVelocityY);
  }

  @subscribe(Events.ExplosionChain, { execution: ExecuteOn.Owner })
  private _onExplosionChain(p: Events.ExplosionChainPayload): void {
    const scale = Math.min(p.chainSize, 5); // cap scaling at 5
    this._freeze(FREEZE_EXPLOSION * (0.5 + scale * 0.1));
    CameraShakeService.get().shake(
      SHAKE_EXPLOSION.intensity * (0.6 + scale * 0.08),
      SHAKE_EXPLOSION.duration,
    );
  }

  @subscribe(Events.BallLost, { execution: ExecuteOn.Owner })
  private _onBallLost(): void {
    this._freeze(FREEZE_BALL_LOST);
    // CameraShakeService already handles BallLost shake, but we override with stronger values
    CameraShakeService.get().shake(SHAKE_BALL_LOST.intensity, SHAKE_BALL_LOST.duration);
  }

  // ── Particle spawning ──────────────────────────────────────────────────────

  /** Small directional sparks when ball hits paddle. */
  private _spawnPaddleSparks(pos: Vec3, ballVx: number, ballVy: number): void {
    const vfx = VfxService.get();
    for (let i = 0; i < PADDLE_SPARK_COUNT; i++) {
      const spread = (Math.random() - 0.5) * 3;
      const upSpeed = 2 + Math.random() * 3;
      vfx.spawnParticle(
        pos.x + spread * 0.1, pos.y + 0.1, pos.z,
        spread, upSpeed, 0,
        1, 1, 1, 1,  // white sparks
        0.15 + Math.random() * 0.1,
        0.06,
      );
    }
  }

  /** Tiny debris when a brick takes a non-lethal hit. */
  private _spawnCrackParticles(pos: Vec3, color: Color): void {
    const vfx = VfxService.get();
    for (let i = 0; i < BRICK_CRACK_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 1.5;
      vfx.spawnParticle(
        pos.x, pos.y, pos.z,
        Math.cos(angle) * speed, Math.sin(angle) * speed, 1 + Math.random(),
        color.r, color.g, color.b, 1,
        0.2 + Math.random() * 0.1,
        0.05,
      );
    }
  }
}
