/**
 * StatsService — Global named counters, shared across all services.
 *
 * Any service can increment a key; any service can read it.
 * No knowledge of each other required.
 *
 * Conventions:
 *   'taps'            — total player taps ever
 *   'gold_earned'     — total gold earned (post-modifiers)
 *   'generator.N'     — total of generator N purchased
 *   '<action.id>'     — times that action was triggered (1 = one-time purchased)
 */
import { EventService, Service, service } from 'meta/worlds';
import { Events } from '../Types';

@service()
export class StatsService extends Service {

  private _stats: Map<string, number> = new Map();

  increment(key: string, amount: number = 1): void {
    this._stats.set(key, (this._stats.get(key) ?? 0) + amount);
    EventService.sendLocally(Events.StatsChanged, {});
  }

  get(key: string): number {
    return this._stats.get(key) ?? 0;
  }
}
