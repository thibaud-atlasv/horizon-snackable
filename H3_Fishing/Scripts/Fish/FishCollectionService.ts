import { Service, service, subscribe, OnServiceReadyEvent } from 'meta/worlds';
import { Events } from '../Types';

/**
 * FishCollectionService — tracks how many of each fish species the player caught.
 *
 * Storage is in-memory by default. Persistence (PlayerVariables / network sync)
 * can be added here without touching any other file.
 *
 * Extensibility:
 *   - Subscribe to Events.FishCaught elsewhere to react to catches
 *     (e.g. achievement system, daily quest tracker) without modifying this file.
 */
@service()
export class FishCollectionService extends Service {

  /** fishId → catch count */
  private _counts = new Map<number, number>();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    // TODO: load persisted data from PlayerVariables here.
  }

  @subscribe(Events.FishCaught)
  private _onFishCaught(p: Events.FishCaughtPayload): void {
    this.recordCatch(p.fishId);
  }

  recordCatch(fishId: number): void {
    this._counts.set(fishId, (this._counts.get(fishId) ?? 0) + 1);
    // TODO: persist to PlayerVariables here.
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

  /** All caught fish IDs with their counts. */
  all(): Map<number, number> {
    return new Map(this._counts);
  }

  /** All def IDs the player has caught at least once, sorted. */
  caughtDefs(): number[] {
    return [...this._counts.keys()]
      .sort((a, b) => a - b);
  }

  @subscribe(Events.Restart)
  onRestart(_p: Events.RestartPayload): void {
    this._counts.clear();
  }
}
