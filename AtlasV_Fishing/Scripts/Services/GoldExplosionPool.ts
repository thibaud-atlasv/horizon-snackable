import {
  NetworkMode,
  NetworkingService,
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
import { Events, GamePhase, type FishRarity } from '../Types';
import { FISH_DEFS } from '../FishDefs';
import { GoldExplosionViewModel } from '../Components/UI/GoldExplosionViewModel';

const POOL_SIZE        = 6;
const ENTITY_SCALE     = 2;
const PARK_POS         = new Vec3(0, 1000, 0);
const RETURN_DELAY_MS  = 1400; // must exceed GoldExplosionViewModel animation duration

// ── DEBUG ── set to true to spam explosions in Idle for visual testing
const DEBUG_EXPLOSIONS = false;

const GOLD_BY_RARITY: Record<FishRarity, number> = {
  common:    GOLD_REWARD_COMMON,
  rare:      GOLD_REWARD_RARE,
  legendary: GOLD_REWARD_LEGENDARY,
};

// =============================================================================
//  GoldExplosionPool
//
//  Pre-spawns a pool of GoldExplosion UI entities. On FishCaught, looks up
//  the fish rarity, resolves gold value, and plays the explosion at the last
//  known bait position.
// =============================================================================

@service()
export class GoldExplosionPool extends Service {

  private _free         : Entity[] = [];
  private _returnTimers : Map<Entity, number> = new Map();
  private _ready        = false;
  private _debugTimer   = 0;

  @subscribe(Events.GameStarted)
  async onReady(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;

    for (let i = 0; i < POOL_SIZE; i++) {
      const entity = await WorldService.get().spawnTemplate({
        templateAsset: Assets.GoldExplosionUI,
        position:      PARK_POS,
        rotation:      Quaternion.identity,
        scale:         new Vec3(ENTITY_SCALE, ENTITY_SCALE, ENTITY_SCALE),
        networkMode:   NetworkMode.LocalOnly,
      }).catch(() => null);
      if (entity) this._free.push(entity);
    }
    this._ready = true;
    console.log(`[GoldExplosionPool] ready (${this._free.length}/${POOL_SIZE})`);
  }

  @subscribe(Events.PhaseChanged)
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    if (!DEBUG_EXPLOSIONS) return;
    if (p.phase === GamePhase.Idle) {
      this._scheduleDebugExplosion();
    } else {
      clearTimeout(this._debugTimer);
      this._debugTimer = 0;
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  playAt(x: number, y: number, value: number): void {
    if (!this._ready) { console.warn('[GoldExplosionPool] not ready'); return; }
    if (this._free.length === 0) { console.warn('[GoldExplosionPool] pool empty'); return; }

    const entity = this._free.pop()!;

    const existing = this._returnTimers.get(entity);
    if (existing) clearTimeout(existing);

    const tc = entity.getComponent(TransformComponent);
    if (tc) {
      tc.worldPosition = new Vec3(x, y, 0);
      tc.localScale    = new Vec3(ENTITY_SCALE, ENTITY_SCALE, ENTITY_SCALE);
    } else {
      console.warn('[GoldExplosionPool] TransformComponent null');
    }

    const vm = entity.getComponent(GoldExplosionViewModel);
    if (vm) vm.play(value);
    else console.warn('[GoldExplosionPool] GoldExplosionViewModel null');

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

  // ── Debug ───────────────────────────────────────────────────────────────────

  private _scheduleDebugExplosion(): void {
    this._debugTimer = setTimeout(() => {
      const x = (Math.random() - 0.5) * 6;
      const y = 4 + Math.random() * 5;
      const values = [5, 15, 40];
      this.playAt(x, y, values[Math.floor(Math.random() * values.length)]);
      this._scheduleDebugExplosion();
    }, 500) as unknown as number;
  }
}
