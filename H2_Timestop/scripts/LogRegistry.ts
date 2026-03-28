import type { IFallingObj } from './Types';

/**
 * FallingObjRegistry — singleton tracking all active IFallingObj instances.
 *
 * FallingObj.onInitLog calls register(); FallingObj unregisters when frozen.
 * InputManager queries getLowestFallingObj() on player tap.
 * GameManager queries getActiveCount() and getWaitingFallingObj().
 */
export class FallingObjRegistry {
  private static _instance: FallingObjRegistry;
  private _objs: Map<number, IFallingObj> = new Map();

  private constructor() {}

  static get(): FallingObjRegistry {
    if (!FallingObjRegistry._instance) {
      FallingObjRegistry._instance = new FallingObjRegistry();
    }
    return FallingObjRegistry._instance;
  }

  dispose(): void {
    this._objs.clear();
    FallingObjRegistry._instance = undefined!;
  }

  register(obj: IFallingObj): void {
    this._objs.set(obj.objId, obj);
  }

  unregister(objId: number): void {
    this._objs.delete(objId);
  }

  getActiveCount(): number {
    return this._objs.size;
  }

  getWaitingFallingObj(): IFallingObj | undefined {
    for (const obj of this._objs.values()) {
      if (obj.waiting()) return obj;
    }
    return undefined;
  }

  /**
   * Returns the active (non-waiting) falling object whose lowest point
   * is closest to the floor (minimum world Y in Y-up space).
   */
  getLowestFallingObj(): IFallingObj | null {
    let closest: IFallingObj | null = null;
    let closestY = Infinity;
    for (const obj of this._objs.values()) {
      if (obj.waiting()) continue;
      const y = obj.getLowestY();
      if (y < closestY) {
        closestY = y;
        closest = obj;
      }
    }
    return closest;
  }
}
