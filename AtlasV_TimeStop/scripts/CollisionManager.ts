import type { ICollider, Rect } from './Types';

/**
 * Generic AABB collision singleton.
 *
 * Usage:
 *   CollisionManager.get().register(this);      // in onStart
 *   CollisionManager.get().unregister(this);     // in onDestroy / cleanup
 *   CollisionManager.get().checkAgainst(mover);  // per substep in the mover's update loop
 *   CollisionManager.get().dispose();            // on restart / level change
 */
export class CollisionManager {
  private static _instance: CollisionManager;
  private _colliders: Set<ICollider> = new Set();

  private constructor() {}

  static get(): CollisionManager {
    if (!CollisionManager._instance) {
      CollisionManager._instance = new CollisionManager();
    }
    return CollisionManager._instance;
  }

  dispose(): void {
    this._colliders.clear();
    CollisionManager._instance = undefined!;
  }

  register(collider: ICollider): void {
    this._colliders.add(collider);
  }

  unregister(collider: ICollider): void {
    this._colliders.delete(collider);
  }

  /** Returns all registered colliders whose center falls within `radius` of (`cx`, `cy`). */
  query(cx: number, cy: number, radius: number): ICollider[] {
    const result: ICollider[] = [];
    for (const collider of this._colliders) {
      const b = collider.getColliderBounds();
      const dx = (b.x + b.w * 0.5) - cx;
      const dy = (b.y + b.h * 0.5) - cy;
      if (dx * dx + dy * dy <= radius * radius) result.push(collider);
    }
    return result;
  }

  /**
   * Checks `mover` against all other registered colliders and fires onCollision
   * on both sides for each overlap. O(n) — call once per substep from the mover's
   * update loop instead of relying on a global interval-based check.
   */
  checkAgainst(mover: ICollider): void {
    const bounds = mover.getColliderBounds();
    for (const other of this._colliders) {
      if (other === mover) continue;
      if (this.overlaps(bounds, other.getColliderBounds())) {
        mover.onCollision(other);
        other.onCollision(mover);
      }
    }
  }

  private overlaps(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x
        && a.y < b.y + b.h && a.y + a.h > b.y;
  }
}
