import {
  EventService,
  NetworkMode,
  NetworkingService,
  OnServiceReadyEvent,
  Quaternion,
  Service,
  TransformComponent,
  Vec3,
  WorldService,
  service,
  subscribe,
  type Entity,
} from 'meta/worlds';

import { Assets } from '../Assets';
import { GOLD_REWARD_COMMON, GOLD_REWARD_RARE, GOLD_REWARD_LEGENDARY } from '../Constants';
import { Events, type FishRarity } from '../Types';
import { FISH_DEFS } from '../FishDefs';
import { GoldExplosionViewModel } from '../Components/UI/GoldExplosionViewModel';

const POOL_SIZE = 6;
const PARK_POS = new Vec3(0, 1000, 0);
const RETURN_DELAY_MS = 700; // must exceed GoldExplosionViewModel's 600ms reset

const GOLD_BY_RARITY: Record<FishRarity, number> = {
  common:    GOLD_REWARD_COMMON,
  rare:      GOLD_REWARD_RARE,
  legendary: GOLD_REWARD_LEGENDARY,
};

// =============================================================================
//  GoldExplosionPool
//
//  Pre-spawns a pool of GoldExplosion UI entities. On FishCollected, looks up
//  the fish rarity, resolves gold value, and plays the explosion at the fish's
//  screen position.
// =============================================================================

@service()
export class GoldExplosionPool extends Service {

  private _free: Entity[] = [];
  private _returnTimers: Map<Entity, number> = new Map();
  private _ready = false;

  @subscribe(OnServiceReadyEvent)
  async onReady(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[GoldExplosionPool] Spawning pool');

    for (let i = 0; i < POOL_SIZE; i++) {
      const entity = await WorldService.get().spawnTemplate({
        templateAsset: Assets.GoldExplosionUI,
        position:      PARK_POS,
        rotation:      Quaternion.identity,
        scale:         Vec3.one,
        networkMode:   NetworkMode.LocalOnly,
      });
      this._free.push(entity);
    }
    this._ready = true;
    console.log('[GoldExplosionPool] Pool ready');
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Move a pooled entity to (x, y, 0), play the gold explosion, then return. */
  playAt(x: number, y: number, value: number): void {
    if (!this._ready || this._free.length === 0) return;

    const entity = this._free.pop()!;

    // Cancel pending return if entity was reused early
    const existing = this._returnTimers.get(entity);
    if (existing) clearTimeout(existing);

    const tc = entity.getComponent(TransformComponent);
    if (tc) tc.worldPosition = new Vec3(x, y, 0);

    const vm = entity.getComponent(GoldExplosionViewModel);
    if (vm) vm.play(value);

    // Return to pool after animation completes
    const timer = setTimeout(() => {
      this._returnTimers.delete(entity);
      const t = entity.getComponent(TransformComponent);
      if (t) t.worldPosition = PARK_POS;
      this._free.push(entity);
    }, RETURN_DELAY_MS) as unknown as number;

    this._returnTimers.set(entity, timer);
  }

  // ── Event handler ───────────────────────────────────────────────────────────

  @subscribe(Events.FishCollected)
  onFishCollected(p: Events.FishCollectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const def = FISH_DEFS.find(d => d.id === p.defId);
    if (!def) return;

    const gold = GOLD_BY_RARITY[def.rarity] ?? GOLD_REWARD_COMMON;
    this.playAt(p.x, p.y, gold);
  }
}
