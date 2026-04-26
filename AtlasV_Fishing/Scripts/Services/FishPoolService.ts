import {
  EventService,
  NetworkMode,
  NetworkingService,
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
  HALF_SCREEN_WORLD_HEIGHT,
  POOL_COUNT_COMMON, POOL_COUNT_RARE, POOL_COUNT_LEGENDARY,
  POOL_RECYCLE_MARGIN, POOL_SPAWN_INTERVAL, POOL_BURST_COUNT,
  WATER_SURFACE_Y,
} from '../Constants';
import { Events, GamePhase, type IFishDef, type IFishInstance } from '../Types';
import { FISH_DEFS } from '../FishDefs';
import { FishRegistry } from './FishRegistry';

// Rarity order for roll priority: commons first, legendaries last.
const RARITY_ORDER: Record<string, number> = { common: 0, rare: 1, legendary: 2 };
const DEFS_BY_RARITY = [...FISH_DEFS].sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);

// =============================================================================
//  FishPoolService — typed sub-pool fish management.
//
//  Each defId owns a fixed-size sub-pool of pre-spawned entities that NEVER
//  change their template/mesh. Entities are either "active" (swimming visibly)
//  or "benched" (parked far below the visible area, awaiting reuse).
//
//  Each frame:
//    1. Active non-hooked fish above camTop are benched.
//    2. _rollDef() picks a defId appropriate for camera depth.
//    3. One benched entity of that defId is activated at a random Y below camera.
// =============================================================================
@service()
export class FishPoolService extends Service {

  private _camCenterY  = 0;
  private _hookY       = WATER_SURFACE_Y;
  private _spawnTimer  = 0;
  private _phase       = GamePhase.Idle;

  // Per-defId bench queues (idle entities parked off-screen)
  private _bench = new Map<number, IFishInstance[]>();

  @subscribe(Events.GameStarted)
  async onReady(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;
    await this._spawnPool();
    this._burst();
  }

  /** Called by GameCameraService each frame. */
  setCameraY(centerY: number): void {
    this._camCenterY = centerY;
  }

  @subscribe(Events.PhaseChanged)
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    this._phase = p.phase;
  }

  @subscribe(Events.HookMoved)
  onHookMoved(p: Events.HookMovedPayload): void {
    this._hookY = p.y;
  }

  @subscribe(Events.FishReady)
  onFishReady(p: Events.FishReadyPayload): void {
    const inst = FishRegistry.get().getInstance(p.fishId);
    if (!inst) return;
    const list = this._bench.get(inst.defId);
    if (list) list.push(inst);
  }

  /** Called by HookController after a fish is collected — returns it to its bench. */
  returnToBench(fish: IFishInstance): void {
    const parkY = this._camCenterY - HALF_SCREEN_WORLD_HEIGHT - 200;
    fish.park(parkY);
    const list = this._bench.get(fish.defId);
    if (list) list.push(fish);
  }

  // ── Per-frame recycle ─────────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    // No recycling while hook + fish are rising — camera moves fast and free
    // fish near the surface would be incorrectly benched
    if (this._phase === GamePhase.Surfacing || this._phase === GamePhase.Launching) return;

    const camTop    = this._camCenterY + HALF_SCREEN_WORLD_HEIGHT + POOL_RECYCLE_MARGIN;
    const camBottom = this._camCenterY - HALF_SCREEN_WORLD_HEIGHT - POOL_RECYCLE_MARGIN;

    // Step 1 — bench any free fish that scrolled above camera
    for (const inst of FishRegistry.get().allActive()) {
      if (inst.isHooked || inst.isFlying) continue;
      if (inst.worldY > camTop) {
        const list = this._bench.get(inst.defId);
        if (list) {
          inst.park(camBottom - 200);
          list.push(inst);
        }
      }
    }

    // Step 2 — activate one benched fish on interval
    this._spawnTimer -= p.deltaTime;
    if (this._spawnTimer > 0) return;
    this._spawnTimer = POOL_SPAWN_INTERVAL;

    const slotY = camBottom - Math.random() * 40;
    const depth = WATER_SURFACE_Y - slotY;
    const def   = this._rollDef(depth);
    if (def) {
      const bench = this._bench.get(def.id);
      if (bench && bench.length > 0) {
        const sfc    = bench.pop()!;
        const spawnX = FISH_LEFT + Math.random() * (FISH_RIGHT - FISH_LEFT);
        const size   = def.sizeMin + Math.random() * (def.sizeMax - def.sizeMin);
        sfc.activate(spawnX, slotY, def.speedMin, def.speedMax, size);
      }
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private async _spawnPool(): Promise<void> {
    const parkY = WATER_SURFACE_Y - 500; // well below any gameplay depth

    for (const def of FISH_DEFS) {
      const count = def.rarity === 'legendary' ? POOL_COUNT_LEGENDARY
                  : def.rarity === 'rare'      ? POOL_COUNT_RARE
                  :                              POOL_COUNT_COMMON;

      this._bench.set(def.id, []);

      for (let i = 0; i < count; i++) {
        const entity = await WorldService.get().spawnTemplate({
          templateAsset: def.template,
          position:      new Vec3(0, parkY, 0),
          rotation:      Quaternion.identity,
          scale:         Vec3.one,
          networkMode:   NetworkMode.LocalOnly,
        }).catch(() => null);

        if (entity) {
          // size/speed don't matter here — activate() will set them on first use
          EventService.sendLocally(
            Events.InitFish,
            { defId: def.id, spawnX: 0, baseY: parkY, speedMin: def.speedMin, speedMax: def.speedMax, size: 1 },
            { eventTarget: entity },
          );
        }
      }
    }
  }

  /** Fills the visible area with fish immediately after pool creation. */
  private _burst(): void {
    const visibleTop    = WATER_SURFACE_Y;
    const visibleBottom = WATER_SURFACE_Y - HALF_SCREEN_WORLD_HEIGHT * 4; // spread over 2× visible height
    const slots         = POOL_BURST_COUNT;

    for (let i = 0; i < slots; i++) {
      const slotY = visibleTop + (visibleBottom - visibleTop) * (i / slots) - Math.random() * 2;
      const depth = WATER_SURFACE_Y - slotY;
      const def   = this._rollDef(depth);
      if (!def) continue;
      const bench = this._bench.get(def.id);
      if (!bench || bench.length === 0) continue;
      const sfc    = bench.pop()!;
      const spawnX = FISH_LEFT + Math.random() * (FISH_RIGHT - FISH_LEFT);
      const size   = def.sizeMin + Math.random() * (def.sizeMax - def.sizeMin);
      sfc.activate(spawnX, slotY, def.speedMin, def.speedMax, size);
    }
  }

  /**
   * Rolls defs in rarity order (common → rare → legendary).
   * First hit wins. Returns null if nothing hits (empty slot).
   *
   * Wave formula:
   *   wave = sin(depth/wave1Period + wave1Offset) × sin(depth/wave2Period + wave2Offset)
   *   effectiveChance = spawnChance × max(0, wave)
   */
  private _rollDef(depth: number): IFishDef | null {
    for (const def of DEFS_BY_RARITY) {
      // Only eligible below depthMin
      const minDepth = def.depthMin !== undefined ? -def.depthMin : 0;
      if (depth < minDepth) continue;

      // Skip if no benched entity available for this def
      const bench = this._bench.get(def.id);
      if (!bench || bench.length === 0) continue;

      // Wave modulation — product of two sines with irrational period ratio
      const wave = Math.sin(depth / def.wave1Period + def.wave1Offset)
                 * Math.sin(depth / def.wave2Period + def.wave2Offset);
      if (wave <= 0) continue;

      if (Math.random() < def.spawnChance * wave) return def;
    }
    return null;
  }
}
