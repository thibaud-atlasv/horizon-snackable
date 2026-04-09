import {
  Component, OnEntityStartEvent, OnWorldUpdateEvent,
  TransformComponent, NetworkingService,
  Vec3, Quaternion, ExecuteOn,
  component, property, subscribe,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload, Maybe, Entity } from 'meta/worlds';
import { GoalkeeperService } from '../Services/GoalkeeperService';

@component()
export class GoalkeeperController extends Component {

  /** Scene entity used as a fake shadow blob on the ground. */
  @property() shadow: Maybe<Entity> = null;

  private _transform: Maybe<TransformComponent> = null;
  private _shadowTransform: Maybe<TransformComponent> = null;

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
  onUpdate(_p: OnWorldUpdateEventPayload): void {
    if (!this._transform) return;

    const gk = GoalkeeperService.get();

    this._transform.localPosition = new Vec3(gk.posX, gk.posY, gk.startZ);
    this._transform.localRotation = Quaternion.fromEuler(new Vec3(0, 0, gk.rotZ * (180 / Math.PI)));

    // Fake shadow: follows GK on ground, stretches + shifts when diving
    if (this._shadowTransform) {
      const baseScale = 0.75;
      if (gk.diving) {
        const offsetX = gk.diveDir * gk.diveT * 0.8;
        const sx = baseScale + gk.diveT * 0.6;
        const sz = baseScale - gk.diveT * 0.15;
        this._shadowTransform.localPosition = new Vec3(gk.posX + offsetX, 0.01, gk.startZ);
        this._shadowTransform.localScale = new Vec3(sx, 1, sz);
      } else {
        this._shadowTransform.localPosition = new Vec3(gk.posX, 0.01, gk.startZ);
        this._shadowTransform.localScale = new Vec3(baseScale, 1, baseScale);
      }
    }
  }
}
