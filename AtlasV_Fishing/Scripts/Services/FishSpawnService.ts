import {
  EventService,
  NetworkMode,
  NetworkingService,
  OnServiceReadyEvent,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  Quaternion,
  Service,
  Vec3,
  WorldService,
  service,
  subscribe,
} from 'meta/worlds';

import {
  FISH_LEFT, FISH_RIGHT,
  FISH_MAX_PER_ZONE, FISH_RESPAWN_INTERVAL,
  ZONE_SPAWN_TOP_Y, ZONE_SPAWN_BOT_Y,
  ZONE_COUNT,
} from '../Constants';
import { Events, type IFishDef } from '../Types';
import { FISH_DEFS } from '../FishDefs';
import { ZoneProgressionService } from './ZoneProgressionService';

/**
 * FishSpawnService — zone-based autonomous fish spawning.
 *
 * Each unlocked zone maintains up to FISH_MAX_PER_ZONE live fish.
 * When a fish is caught, its zone count decreases and a respawn timer starts.
 */
@service()
export class FishSpawnService extends Service {

  private _zoneCounts = [0, 0, 0];
  private _zoneTimers = [0, 0, 0];

  private networking = Service.injectWeak(NetworkingService);
  private isClient? : boolean = false;

  @subscribe(Events.GameStarted)
  onReady(): void {
    this.isClient = this.networking?.isPlayerContext();
    for (let z = 0; z < ZONE_COUNT; z++) {
      this._fillZone(z);
    }
  }

  @subscribe(Events.ZoneUnlocked)
  private _onZoneUnlocked(p: Events.ZoneUnlockedPayload): void {
    this._fillZone(p.zone - 1);
  }

  @subscribe(Events.FishCaught)
  private _onFishCaught(p: Events.FishCaughtPayload): void {
    const def = FISH_DEFS.find(d => d.id === p.defId);
    if (!def) return;
    const zoneIndex = def.zone - 1;
    this._zoneCounts[zoneIndex] = Math.max(0, this._zoneCounts[zoneIndex] - 1);
  }

  @subscribe(OnWorldUpdateEvent)
  private _onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this.isClient) return;
    const dt = p.deltaTime;

    for (let z = 0; z < ZONE_COUNT; z++) {
      if (this._zoneCounts[z] < FISH_MAX_PER_ZONE) {
        this._zoneTimers[z] -= dt;
        if (this._zoneTimers[z] <= 0) {
          this._spawnInZone(z);
          this._zoneTimers[z] = FISH_RESPAWN_INTERVAL;
        }
      }
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _fillZone(zoneIndex: number): void {
    this._zoneTimers[zoneIndex] = FISH_RESPAWN_INTERVAL;
    for (let i = 0; i < FISH_MAX_PER_ZONE; i++) {
      this._spawnInZone(zoneIndex);
    }
  }

  private async _spawnInZone(zoneIndex: number): Promise<void> {
    if (this._zoneCounts[zoneIndex] >= FISH_MAX_PER_ZONE) return;
    const def = this._pickDef(zoneIndex);
    if (!def) return;

    const spawnX = FISH_LEFT + Math.random() * (FISH_RIGHT - FISH_LEFT);
    const botY   = ZONE_SPAWN_BOT_Y[zoneIndex];
    const topY   = ZONE_SPAWN_TOP_Y[zoneIndex];
    const spawnY = botY + Math.random() * (topY - botY);
    const size   = def.sizeMin + Math.random() * (def.sizeMax - def.sizeMin);

    const entity = await WorldService.get().spawnTemplate({
      templateAsset: def.template,
      position:      new Vec3(spawnX, spawnY, 0),
      rotation:      Quaternion.identity,
      scale:         new Vec3(size, size, size),
      networkMode:   NetworkMode.LocalOnly,
    });

    EventService.sendLocally(
      Events.InitFish,
      { defId: def.id, spawnX, baseY: spawnY, speedMin: def.speedMin, speedMax: def.speedMax, size },
      { eventTarget: entity },
    );

    this._zoneCounts[zoneIndex]++;
  }

  private _pickDef(zoneIndex: number): IFishDef | null {
    const zone            = zoneIndex + 1;
    const legendaryChance = ZoneProgressionService.get().legendarySpawnChance(zone);

    if (Math.random() < legendaryChance) {
      const legendary = FISH_DEFS.find(d => d.zone === zone && d.rarity === 'legendary');
      if (legendary) return legendary;
    }

    const pool = FISH_DEFS.filter(d => d.zone === zone && d.rarity !== 'legendary');
    if (pool.length === 0) return null;

    const weights = pool.map(d => d.rarity === 'rare' ? 3 : 10);
    const total   = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }
}
