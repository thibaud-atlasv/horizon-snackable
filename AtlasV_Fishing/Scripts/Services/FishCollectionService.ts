import { Service, service, subscribe } from 'meta/worlds';
import { Events } from '../Types';

/**
 * FishCollectionService — tracks how many of each fish species the player caught.
 *
 * Seeded from persisted data via Events.ProgressLoaded.
 * Updated locally on each FishCaught.
 */
@service()
export class FishCollectionService extends Service {

  /** defId → catch count */
  private _counts = new Map<number, number>();

  @subscribe(Events.ProgressLoaded)
  onProgressLoaded(p: Events.ProgressLoadedPayload): void {
    this._counts.clear();
    for (let i = 0; i < p.catchDefIds.length; i++) {
      this._counts.set(p.catchDefIds[i], p.catchCounts[i]);
    }
  }

  @subscribe(Events.FishCaught)
  private _onFishCaught(p: Events.FishCaughtPayload): void {
    this._counts.set(p.defId, (this._counts.get(p.defId) ?? 0) + 1);
  }

  hasCaught(fishId: number): boolean {
    return (this._counts.get(fishId) ?? 0) > 0;
  }

  getCount(fishId: number): number {
    return this._counts.get(fishId) ?? 0;
  }

  totalUnique(): number {
    return this._counts.size;
  }

  /** All def IDs the player has caught at least once, sorted. */
  caughtDefs(): number[] {
    return [...this._counts.keys()].sort((a, b) => a - b);
  }
}
