import { Service, service } from 'meta/worlds';
import type { IFishInstance } from '../Types';
import { HOOK_COLLECT_RADIUS } from '../Constants';

/**
 * FishRegistry — live instance registry for the pool.
 *
 * Tracks all active fish by fishId.
 * Provides multi-hit collision queries for HookController.
 * Provides allFree() iterator for FishPoolService recycling.
 */
@service()
export class FishRegistry extends Service {

  private _instances = new Map<number, IFishInstance>();

  addFish(inst: IFishInstance): void {
    this._instances.set(inst.fishId, inst);
  }

  getInstance(fishId: number): IFishInstance | undefined {
    return this._instances.get(fishId);
  }

  get activeCount(): number {
    return this._instances.size;
  }

  /** All registered fish (active + benched) — used by FishPoolService. */
  allActive(): IterableIterator<IFishInstance> {
    return this._instances.values();
  }

  /**
   * Returns all free fish whose centre is within HOOK_COLLECT_RADIUS × size
   * of the hook position. Used by HookController during Diving.
   */
  findHits(hx: number, hy: number): IFishInstance[] {
    const hits: IFishInstance[] = [];
    for (const inst of this._instances.values()) {
      if (inst.isHooked) continue;
      const dx = hx - inst.worldX;
      const dy = hy - inst.worldY;
      if (Math.sqrt(dx * dx + dy * dy) < HOOK_COLLECT_RADIUS * inst.size) {
        hits.push(inst);
      }
    }
    return hits;
  }
}
