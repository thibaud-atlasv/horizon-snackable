import {
  Component, OnEntityStartEvent, OnWorldUpdateEvent,
  TransformComponent, NetworkingService,
  Vec3, Quaternion, ExecuteOn,
  component, property, subscribe,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload, Maybe, Entity } from 'meta/worlds';
import { BallService } from '../Services/BallService';
import { BALL_RADIUS } from '../Constants';
import {
  IDLE_PAUSE_DURATION,
  IDLE_BOUNCE_COUNT,
  IDLE_BOUNCE_HEIGHT_0, IDLE_BOUNCE_DECAY,
  IDLE_HALF_PERIOD_0, IDLE_HALF_PERIOD_DECAY,
  IDLE_SQUASH_0, IDLE_SQUASH_DECAY,
  IDLE_STRETCH_0, IDLE_STRETCH_DECAY,
  IDLE_SQUASH_FRAMES,
} from '../Constants';

@component()
export class BallController extends Component {

  /** Scene entity used as a fake shadow blob on the ground. */
  @property() shadow: Maybe<Entity> = null;

  private _transform: Maybe<TransformComponent> = null;
  private _shadowTransform: Maybe<TransformComponent> = null;
  private _rotation: Quaternion = Quaternion.identity;

  // Idle bounce animation
  private _idleTime: number = 0;
  private _wasActive: boolean = false;

  private _networkingService = NetworkingService.get();

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (this._networkingService.isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
    if (this.shadow) {
      this._shadowTransform = this.shadow.getComponent(TransformComponent)!;
      this.shadow.setParent(null, { preserveWorldTransform:true });
    }
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._transform) return;

    const ball = BallService.get();
    const step = p.deltaTime * 60;

    // Detect active → idle transition: reset rotation so squash/stretch stays on world Y
    if (this._wasActive && !ball.active) {
      this._rotation = Quaternion.identity;
      this._idleTime = 0;
    }
    this._wasActive = ball.active;

    const d = BALL_RADIUS * 2;
    if (ball.active) {
      this._idleTime = 0;
      this._transform.localPosition = ball.position();
      this._transform.localScale = new Vec3(d, d, d);
    } else {
      this._idleTime += p.deltaTime;
      const { height, scaleY } = this._evalIdleAnim(this._idleTime);
      const scaleXZ = 1 / Math.sqrt(scaleY);
      this._transform.localPosition = new Vec3(ball.posX, ball.posY + height, ball.posZ);
      this._transform.localScale = new Vec3(d * scaleXZ, d * scaleY, d * scaleXZ);
    }

    // Rolling spin — apply incremental quaternion rotations
    if (ball.active) {
      const spinX = -ball.velZ * 0.8 * step;
      const spinZ = -ball.velX * 0.8 * step;

      if (Math.abs(spinX) > 0.0001) {
        this._rotation = this._rotation.mul(
          Quaternion.fromAxisAngle(new Vec3(1, 0, 0), spinX),
        );
      }
      if (Math.abs(spinZ) > 0.0001) {
        this._rotation = this._rotation.mul(
          Quaternion.fromAxisAngle(new Vec3(0, 0, 1), spinZ),
        );
      }
    }

    this._transform.localRotation = this._rotation;

    // Fake shadow: follows ball XZ on the ground, shrinks as ball goes higher
    if (this._shadowTransform) {
      this._shadowTransform.localPosition = new Vec3(ball.posX, 0.01, ball.posZ);
      const s = Math.max(0.1, 0.75 - ball.posY * 0.15);
      this._shadowTransform.localScale = new Vec3(s, s, s);
    }
  }

  resetRotation(): void {
    this._rotation = Quaternion.identity;
  }

  /**
   * Returns { height, scaleY } for the idle call-to-action animation at time t.
   * Sequence: pause → bounce 0 (tallest) → bounce 1 → bounce 2 (smallest) → repeat.
   */
  private _evalIdleAnim(t: number): { height: number; scaleY: number } {
    // Compute total cycle duration: pause + sum of all bounce half-periods
    let cycleDuration = IDLE_PAUSE_DURATION;
    let halfPeriod = IDLE_HALF_PERIOD_0;
    for (let i = 0; i < IDLE_BOUNCE_COUNT; i++) {
      cycleDuration += halfPeriod * 2 + IDLE_SQUASH_FRAMES;
      halfPeriod *= IDLE_HALF_PERIOD_DECAY;
    }

    const tCycle = t % cycleDuration;

    // Still in pause phase
    if (tCycle < IDLE_PAUSE_DURATION) {
      return { height: 0, scaleY: 1 };
    }

    // Walk through bounces
    let cursor = IDLE_PAUSE_DURATION;
    let bounceHeight = IDLE_BOUNCE_HEIGHT_0;
    let bounceHalf   = IDLE_HALF_PERIOD_0;
    let squash       = IDLE_SQUASH_0;
    let stretch      = IDLE_STRETCH_0;

    for (let i = 0; i < IDLE_BOUNCE_COUNT; i++) {
      const bounceDuration = bounceHalf * 2 + IDLE_SQUASH_FRAMES;
      const tBounce = tCycle - cursor;

      if (tBounce < bounceDuration) {
        // Ground-contact squash flat at the start of the bounce
        if (tBounce < IDLE_SQUASH_FRAMES) {
          const squashT = 1 - tBounce / IDLE_SQUASH_FRAMES; // 1→0 as contact ends
          const sy = 1 - (1 - squash) * squashT;
          return { height: 0, scaleY: sy };
        }

        // Parabolic arc: tArc in [0..1] over the full up-and-down
        const tArc = (tBounce - IDLE_SQUASH_FRAMES) / (bounceHalf * 2);
        const tPI  = tArc * Math.PI;
        const height = Math.sin(tPI) * bounceHeight;
        const scaleY = squash + (stretch - squash) * Math.sin(tPI);
        return { height, scaleY };
      }

      cursor      += bounceDuration;
      bounceHeight *= IDLE_BOUNCE_DECAY;
      bounceHalf   *= IDLE_HALF_PERIOD_DECAY;
      squash        = 1 - (1 - squash) * IDLE_SQUASH_DECAY;
      stretch       = 1 + (stretch - 1) * IDLE_STRETCH_DECAY;
    }

    // Gap between last bounce and next cycle (resting)
    return { height: 0, scaleY: 1 };
  }
}
