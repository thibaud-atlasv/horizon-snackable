import { Color, component, EventService, property, Vec3 } from 'meta/worlds';
import { Events, type IBrick, type ICollider } from '../Types';
import { CollisionManager } from '../CollisionManager';
import { Brick } from './Brick';

// Tracks bricks currently exploding to prevent infinite chain loops.
const _explodingBricks: Set<ExplosiveBrick> = new Set();

/**
 * Component Attachment: Spawned Entity (brick template instance)
 * Component Networking: Local (all gameplay runs locally on client)
 *
 * A brick that destroys adjacent bricks when hit. Chain reactions
 * occur when adjacent ExplosiveBricks are caught in the blast radius.
 * Color and HP are managed by the base Brick class via LevelConfig.
 *
 * Decorator inheritance note: @subscribe handlers from Brick (onStart,
 * onDestroy, InitBrick) are expected to be inherited. If the framework
 * does not traverse the prototype chain for decorators, re-declare them
 * here and call super.
 */
@component()
export class ExplosiveBrick extends Brick {
  @property()
  explosionRadius: number = 1.0;

  /**
   * Entry point for external destruction (explosion chain from a neighbor).
   * Guards against being triggered twice in the same chain.
   */
  override triggerDestruction(): void {
    if (_explodingBricks.has(this)) return;
    _explodingBricks.add(this);
    CollisionManager.get().unregister(this);
    this.onDestroyBrick();
  }

  /** Destroys adjacent bricks then self. Called by triggerDestruction and onCollision (via base HP logic). */
  protected override onDestroyBrick(): void {
    const pos = this._transform.worldPosition;
    const adjacent = this._queryAdjacentBricks(pos);
    EventService.sendLocally(Events.ExplosionChain, {
      position: pos,
      chainSize: adjacent.length + 1,
    });
    for (const brick of adjacent) brick.triggerDestruction();
    this._flash(() => {
      EventService.sendLocally(Events.BrickDestroyed, { position: pos, color: Color.red });
      _explodingBricks.delete(this);
      this._park();
    });
  }

  private _queryAdjacentBricks(center: Vec3): IBrick[] {
    return CollisionManager.get()
      .query(center.x, center.y, this.explosionRadius)
      .filter((c): c is IBrick => c.colliderTag === 'brick' && c !== (this as ICollider));
  }
}
