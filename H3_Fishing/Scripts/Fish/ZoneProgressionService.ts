import { EventService, Service, service, subscribe, OnServiceReadyEvent } from 'meta/worlds';
import {
  ZONE_FLOOR_Y,
  XP_NEW_FISH, XP_DUPLICATE_FISH,
  XP_UNLOCK_ZONE_2, XP_UNLOCK_ZONE_3,
} from '../Constants';
import { Events, HUDEvents } from '../Types';
import { FISH_DEFS } from './FishDefs';

/**
 * ZoneProgressionService — single source of truth for:
 *   - Global XP and zone unlock thresholds
 *   - Current unlocked zone count
 *   - Dynamic bait floor Y (used by RodController)
 *   - Legendary spawn probability per zone (used by FishSpawnService)
 */
@service()
export class ZoneProgressionService extends Service {

  private _xp            = 0;
  private _unlockedZones = 3;

  // 0-indexed, tracks defIds caught per zone for legendary probability
  private _caughtPerZone: Set<number>[] = [new Set(), new Set(), new Set()];

  // Own seen-set so we don't depend on FishCollectionService event order
  private _everCaught = new Set<number>();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    EventService.sendLocally(HUDEvents.UpdateXP, { xp: 0, maxXp: XP_UNLOCK_ZONE_3 });
  }

  @subscribe(Events.ProgressLoaded)
  onProgressLoaded(p: Events.ProgressLoadedPayload): void {
    this._xp            = p.xp;
    this._unlockedZones = p.unlockedZones;
    this._everCaught    = new Set(p.catchDefIds);
    this._caughtPerZone = [new Set(), new Set(), new Set()];
    for (const defId of p.catchDefIds) {
      const def = FISH_DEFS.find(d => d.id === defId);
      if (def) this._caughtPerZone[def.zone - 1].add(defId);
    }
    EventService.sendLocally(HUDEvents.UpdateXP, { xp: this._xp, maxXp: XP_UNLOCK_ZONE_3 });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  getFloorY(): number {
    return ZONE_FLOOR_Y[this._unlockedZones - 1];
  }

  getUnlockedZones(): number {
    return this._unlockedZones;
  }

  getTotalXP(): number {
    return this._xp;
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

  addCatch(defId: number, isNew: boolean): void {
    this._xp += isNew ? XP_NEW_FISH : XP_DUPLICATE_FISH;

    const def = FISH_DEFS.find(d => d.id === defId);
    if (def) {
      this._caughtPerZone[def.zone - 1].add(defId);
    }

    this._checkUnlocks();
    EventService.sendLocally(HUDEvents.UpdateXP, { xp: this._xp, maxXp: XP_UNLOCK_ZONE_3 });
  }

  // ── Event Handlers ───────────────────────────────────────────────────────────

  @subscribe(Events.FishCaught)
  private _onFishCaught(p: Events.FishCaughtPayload): void {
    const isNew = !this._everCaught.has(p.defId);
    this._everCaught.add(p.defId);
    this.addCatch(p.defId, isNew);
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _checkUnlocks(): void {
    if (this._unlockedZones < 2 && this._xp >= XP_UNLOCK_ZONE_2) {
      this._unlockedZones = 2;
      EventService.sendLocally(Events.ZoneUnlocked, { zone: 2 });
    }
    if (this._unlockedZones < 3 && this._xp >= XP_UNLOCK_ZONE_3) {
      this._unlockedZones = 3;
      EventService.sendLocally(Events.ZoneUnlocked, { zone: 3 });
    }
  }
}
