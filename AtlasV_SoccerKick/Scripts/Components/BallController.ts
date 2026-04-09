import {
  Component, OnEntityStartEvent, OnWorldUpdateEvent,
  TransformComponent, NetworkingService,
  Vec3, Quaternion, ExecuteOn,
  component, property, subscribe,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload, Maybe, Entity } from 'meta/worlds';
import { BallService } from '../Services/BallService';

@component()
export class BallController extends Component {

  /** Scene entity used as a fake shadow blob on the ground. */
  @property() shadow: Maybe<Entity> = null;

  private _transform: Maybe<TransformComponent> = null;
  private _shadowTransform: Maybe<TransformComponent> = null;
  private _rotation: Quaternion = Quaternion.identity;

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

    this._transform.localPosition = ball.position();

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
}
