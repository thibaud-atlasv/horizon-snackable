import {
  EventService,
  NetworkingService,
  PlayerVariablesService,
  Service,
  service,
  subscribe,
  serializable,
  type Entity,
} from 'meta/worlds';

import { Events, NetworkEvents } from './Types';
import { XP_NEW_FISH, XP_DUPLICATE_FISH, XP_UNLOCK_ZONE_2, XP_UNLOCK_ZONE_3 } from './Constants';

// ─── Persisted shape ─────────────────────────────────────────────────────────
@serializable()
class SaveData {
  readonly catchDefIds   : readonly number[] = [];
  readonly catchCounts   : readonly number[] = [];
  readonly xp            : number            = 0;
  readonly unlockedZones : number            = 1;
}

const SAVE_KEY = 'fishCollection';

// =============================================================================
//  PlayerProgressService
//
//  Single entry point for persistence. Single-player world — one player at a time.
//
//  Server:
//    - OnPlayerCreate → fetchVariable → sendToOwner(ProgressData)
//    - ReportCatch    → update in-memory state → setVariable
//
//  Client:
//    - ProgressData   → Events.ProgressLoaded (local) → services seed themselves
//    - FishCaught     → sendGlobally(ReportCatch) → server persists
// =============================================================================

@service()
export class PlayerProgressService extends Service {

  // Server-side state — single player, stored directly
  private _player  : Entity | null          = null;
  private _counts  : Map<number, number>    = new Map();
  private _xp      = 0;
  private _zones   = 1;

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
      this._xp    = save.xp;
      this._zones = save.unlockedZones;

      EventService.sendToOwner(NetworkEvents.ProgressData, {
        catchDefIds:   save.catchDefIds,
        catchCounts:   save.catchCounts,
        xp:            save.xp,
        unlockedZones: save.unlockedZones,
      }, player);
    } else {
      // First session — persist empty record immediately
      this._persist();
    }
  }

  // ── Server: client reports a catch ──────────────────────────────────────────

  @subscribe(NetworkEvents.ReportCatch)
  onReportCatch(p: NetworkEvents.ReportCatchPayload): void {
    if (!NetworkingService.get().isServerContext()) return;

    const isNew = !this._counts.has(p.defId);
    this._counts.set(p.defId, (this._counts.get(p.defId) ?? 0) + 1);

    this._xp += isNew ? XP_NEW_FISH : XP_DUPLICATE_FISH;
    if (this._zones < 2 && this._xp >= XP_UNLOCK_ZONE_2) this._zones = 2;
    if (this._zones < 3 && this._xp >= XP_UNLOCK_ZONE_3) this._zones = 3;

    this._persist();
  }

  // ── Client: receive loaded data ──────────────────────────────────────────────

  @subscribe(NetworkEvents.ProgressData)
  onProgressData(p: NetworkEvents.ProgressDataPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.ProgressLoaded, {
      catchDefIds:   p.catchDefIds,
      catchCounts:   p.catchCounts,
      xp:            p.xp,
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
      catchCounts:   catchDefIds.map(id => this._counts.get(id)!),
      xp:            this._xp,
      unlockedZones: this._zones,
    };

    PlayerVariablesService.get()
      .setVariable(this._player, SAVE_KEY, save)
      .catch(e => console.error('[PlayerProgressService] setVariable failed:', e));
  }
}
