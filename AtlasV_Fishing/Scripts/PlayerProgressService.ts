import {
  EventService,
  ExecuteOn,
  NetworkingService,
  PlayerVariablesService,
  Service,
  service,
  subscribe,
  serializable,
  type Entity,
} from 'meta/worlds';

import { Events, NetworkEvents } from './Types';
import { UNLOCK_ZONE_2_UNIQUE, UNLOCK_ZONE_3_UNIQUE } from './Constants';

// ─── Persisted shape ─────────────────────────────────────────────────────────
@serializable()
class SaveData {
  readonly catchDefIds : readonly number[] = [];
  readonly catchCounts : readonly number[] = [];
}

const SAVE_KEY = 'fishCollection';

// =============================================================================
//  PlayerProgressService
//
//  Single entry point for persistence. Single-player world — one player at a time.
//
//  Server:
//    - OnPlayerCreate → fetchVariable → sendGlobally(ProgressData)
//    - ReportCatch    → update counts → setVariable
//
//  Client:
//    - ProgressData → Events.ProgressLoaded (local) → services seed themselves
//    - FishCaught   → sendGlobally(ReportCatch) → server persists
// =============================================================================

@service()
export class PlayerProgressService extends Service {

  private _player : Entity | null       = null;
  private _counts : Map<number, number> = new Map();

  // ── Server: player joins ─────────────────────────────────────────────────────

  async loadForPlayer(player: Entity): Promise<void> {
    if (!NetworkingService.get().isServerContext()) return;
    this._player = player;
    let save: SaveData | undefined;
    try {
      save = await PlayerVariablesService.get().fetchVariable<SaveData>(player, SAVE_KEY);
    } catch (e) {
      console.error('[PlayerProgressService] fetchVariable failed:', e);
    }

    if (save) {
      this._counts = new Map();
      for (let i = 0; i < save.catchDefIds.length; i++) {
        this._counts.set(save.catchDefIds[i], save.catchCounts[i]);
      }
    } else {
      this._persist();
    }

    const unique = this._counts.size;
    const unlockedZones = unique >= UNLOCK_ZONE_3_UNIQUE ? 3
                        : unique >= UNLOCK_ZONE_2_UNIQUE ? 2
                        : 1;

    const catchDefIds = Array.from(this._counts.keys());
    EventService.sendGlobally(NetworkEvents.ProgressData, {
      catchDefIds,
      catchCounts:   catchDefIds.map(id => this._counts.get(id)!),
      unlockedZones,
    });
  }

  // ── Server: client reports a catch ──────────────────────────────────────────

  @subscribe(NetworkEvents.ReportCatch)
  onReportCatch(p: NetworkEvents.ReportCatchPayload): void {
    if (!NetworkingService.get().isServerContext()) return;
    this._counts.set(p.defId, (this._counts.get(p.defId) ?? 0) + 1);
    this._persist();
  }

  // ── Client: receive loaded data ──────────────────────────────────────────────

  @subscribe(NetworkEvents.ProgressData, { execution: ExecuteOn.Everywhere })
  onProgressData(p: NetworkEvents.ProgressDataPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.ProgressLoaded, {
      catchDefIds:   p.catchDefIds,
      catchCounts:   p.catchCounts,
      unlockedZones: p.unlockedZones,
    });
  }

  // ── Client: forward catch to server ─────────────────────────────────────────

  @subscribe(Events.FishCaught)
  onFishCaught(p: Events.FishCaughtPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendGlobally(NetworkEvents.ReportCatch, { defId: p.defId });
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _persist(): void {
    if (!this._player) return;
    const catchDefIds = Array.from(this._counts.keys());
    const save: SaveData = {
      catchDefIds,
      catchCounts: catchDefIds.map(id => this._counts.get(id)!),
    };
    PlayerVariablesService.get()
      .setVariable(this._player, SAVE_KEY, save)
      .catch(e => console.error('[PlayerProgressService] setVariable failed:', e));
  }
}
