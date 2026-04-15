import {
  Component, OnEntityStartEvent, OnWorldUpdateEvent,
  TransformComponent, NetworkingService,
  Vec3, Quaternion, ExecuteOn,
  component, property, subscribe,
  AnimatorComponent,
  AnimStateRequestInfo,
  OnEntityDestroyEvent,
  EntityService,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload, Maybe, Entity } from 'meta/worlds';
import { GoalkeeperService } from '../Services/GoalkeeperService';
import { KeeperDespawnEvent, KeeperDespawnPayload } from '../Events/GameEvents';

@component()
export class GoalkeeperController extends Component {

  /** Scene entity used as a fake shadow blob on the ground. */
  @property() shadow: Maybe<Entity> = null;

  /** Optional debug cube (1-unit edge) placed at the exact collision OBB position/rotation. Leave empty in production. */
  @property() debugHitbox: Maybe<Entity> = null;

  private _transform: Maybe<TransformComponent> = null;
  private _shadowTransform: Maybe<TransformComponent> = null;
  private _debugTransform: Maybe<TransformComponent> = null;

  private _networkingService = NetworkingService.get();

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (this._networkingService.isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
    if (this.shadow) {
      this._shadowTransform = this.shadow.getComponent(TransformComponent)!;
      this.shadow.setParent(null, { preserveWorldTransform: true });
    }
    if (this.debugHitbox) {
      this._debugTransform = this.debugHitbox.getComponent(TransformComponent)!;
      this.debugHitbox.setParent(null, { preserveWorldTransform: true });
    }
  }

  @subscribe(KeeperDespawnEvent, { execution: ExecuteOn.Everywhere })
  onDespawn(_p: KeeperDespawnPayload): void {
    if (this.shadow) this.shadow.setParent(this.entity);
    if (this.debugHitbox) this.debugHitbox.setParent(this.entity);
    this.entity.destroy();
  }

  @subscribe(OnEntityDestroyEvent)
  onDestroy(): void {
    if (this.shadow) this.shadow.destroy();
    if (this.debugHitbox) this.debugHitbox.destroy();
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(_p: OnWorldUpdateEventPayload): void {
    if (!this._transform) return;

    const gk = GoalkeeperService.get();

    // Right-dive animation clips through the ground — compensate with +1 Y offset
    const diveYOffset = (gk.diving && gk.diveDir !== 1) ? gk.diveT : 0;
    this._transform.localPosition = new Vec3(gk.posX, gk.posY + diveYOffset, gk.startZ);
    this._transform.localRotation = Quaternion.fromEuler(new Vec3(0, 0, gk.rotZ * (180 / Math.PI)));

    const entities = this.entity.getChildrenWithComponent(AnimatorComponent);
    if (entities.length > 0) {
      const animator = entities[0].getComponent(AnimatorComponent);
      let animState: string;
      if (gk.diving) {
        animState = 'catch';
      }/* else if (gk.rotZ < 0.01) {
        animState = 'right';
      } else if (gk.rotZ > -0.01) {
        animState = 'left';
      }*/ else {
        animState = 'idle';
      }
      animator?.requestTransition(animState);
    }
    // Debug hitbox — mirrors the exact OBB used by GoalkeeperService.checkSave()
    if (this._debugTransform) {
      const obb = gk.obbDebug;
      this._debugTransform.worldPosition = new Vec3(obb.cx, obb.cy, gk.startZ);
      this._debugTransform.localRotation = Quaternion.fromEuler(new Vec3(0, 0, obb.rotZ * (180 / Math.PI)));
      this._debugTransform.localScale = new Vec3(obb.halfW * 2, obb.halfH * 2, 1);
    }

    // Fake shadow: follows GK on ground, stretches + shifts when diving
    if (this._shadowTransform) {
      const baseScale = new Vec3(gk.shadowBaseX, 1, 1);
      if (gk.diving) {

        const offsetX = gk.diveDir * gk.diveT * 0.8;
        const sx = baseScale.x + gk.diveT * 0.6;
        const sz = baseScale.z - gk.diveT * 0.15;
        this._shadowTransform.localPosition = new Vec3(gk.posX + offsetX, 0.01, gk.startZ);
        this._shadowTransform.localScale = new Vec3(sx, baseScale.y, sz);
      } else {
        this._shadowTransform.localPosition = new Vec3(gk.posX, 0.01, gk.startZ);
        this._shadowTransform.localScale = new Vec3(baseScale.x, baseScale.y, baseScale.z);
      }
    }
  }
}
