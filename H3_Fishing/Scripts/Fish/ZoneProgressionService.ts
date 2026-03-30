import { EventService, Service, service, subscribe } from 'meta/worlds';
import {
  ZONE_FLOOR_Y,
  UNLOCK_ZONE_2_UNIQUE,
  UNLOCK_ZONE_3_UNIQUE,
} from '../Constants';
import { Events, HUDEvents } from '../Types';
import { FISH_DEFS } from './FishDefs';

/**
 * ZoneProgressionService — single source of truth for:
 *   - Current unlocked zone count (based on unique species caught)
 *   - Dynamic bait floor Y (used by RodController)
 *   - Legendary spawn probability per zone (used by FishSpawnService)
 *
 * Zone 2 unlocks at UNLOCK_ZONE_2_UNIQUE unique species caught.
 * Zone 3 unlocks at UNLOCK_ZONE_3_UNIQUE unique species caught.
 */
@service()
export class ZoneProgressionService extends Service {

  private _unlockedZones = 1;

  // 0-indexed, tracks defIds caught per zone for legendary probability
  private _caughtPerZone: Set<number>[] = [new Set(), new Set(), new Set()];

  // Own seen-set so we don't depend on FishCollectionService event order
  private _everCaught = new Set<number>();

  @subscribe(Events.ProgressLoaded)
  onProgressLoaded(p: Events.ProgressLoadedPayload): void {
    this._unlockedZones = p.unlockedZones;
    this._everCaught    = new Set(p.catchDefIds);
    this._caughtPerZone = [new Set(), new Set(), new Set()];
    for (const defId of p.catchDefIds) {
      const def = FISH_DEFS.find(d => d.id === defId);
      if (def) this._caughtPerZone[def.zone - 1].add(defId);
    }
    EventService.sendLocally(HUDEvents.UpdateProgress, { uniqueCaught: this._everCaught.size });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  getFloorY(): number {
    return ZONE_FLOOR_Y[this._unlockedZones - 1];
  }

  getUnlockedZones(): number {
    return this._unlockedZones;
  }

  /**
   * Returns the extra legendary spawn probability for the given zone (1-indexed).
   * +10% if all 3 commons in the zone have been caught.
   * +10% per rare caught in the zone (max 2 rares = max +20% from rares).
   * Total cap: 30%.
   */
  legendarySpawnChance(zone: number): number {
    const zoneIndex = zone - 1;
    const caught    = this._caughtPerZone[zoneIndex];
    const zoneDefs  = FISH_DEFS.filter(d => d.zone === zone);

    const commons = zoneDefs.filter(d => d.rarity === 'common');
    const rares   = zoneDefs.filter(d => d.rarity === 'rare');

    const allCommonsCaught = commons.length > 0 && commons.every(d => caught.has(d.id));
    const caughtRaresCount = rares.filter(d => caught.has(d.id)).length;

    const chance = (allCommonsCaught ? 0.10 : 0) + caughtRaresCount * 0.10;
    return Math.min(0.30, chance);
  }

  // ── Event Handlers ───────────────────────────────────────────────────────────

  @subscribe(Events.FishCaught)
  private _onFishCaught(p: Events.FishCaughtPayload): void {
    const isNew = !this._everCaught.has(p.defId);
    if (!isNew) return;

    this._everCaught.add(p.defId);
    const def = FISH_DEFS.find(d => d.id === p.defId);
    if (def) this._caughtPerZone[def.zone - 1].add(p.defId);

    this._checkUnlocks();
    EventService.sendLocally(HUDEvents.UpdateProgress, { uniqueCaught: this._everCaught.size });
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _checkUnlocks(): void {
    const unique = this._everCaught.size;
    if (this._unlockedZones < 2 && unique >= UNLOCK_ZONE_2_UNIQUE) {
      this._unlockedZones = 2;
      EventService.sendLocally(Events.ZoneUnlocked, { zone: 2 });
    }
    if (this._unlockedZones < 3 && unique >= UNLOCK_ZONE_3_UNIQUE) {
      this._unlockedZones = 3;
      EventService.sendLocally(Events.ZoneUnlocked, { zone: 3 });
    }
  }
}
