import {
  Service, service, subscribe, OnServiceReadyEvent,
  WorldService, NetworkMode, TransformComponent,
} from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { Vec3 } from 'meta/worlds';
import { Assets } from '../Assets';

const OFFSCREEN = new Vec3(0, -100, 0);

// ---------------------------------------------------------------------------
// ProductPoolService — shared pool of Product template entities.
//
// Spawn the pool from GameManager.onStart() via spawnPool(count).
// Can be called multiple times to grow the pool (e.g. belt + warehouse).
// Consumers call claim() to take an entity and release(t) to return it.
// ---------------------------------------------------------------------------
@service()
export class ProductPoolService extends Service {
  private readonly _networking: NetworkingService = Service.inject(NetworkingService);

  private _available: TransformComponent[] = [];

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    this._available = [];
  }

  // Called from GameManager.onStart(). Safe to call multiple times.
  async spawnPool(count: number): Promise<void> {
    if (this._networking.isServerContext()) return;

    const spawns = Array.from({ length: count }, (_, idx) =>
      WorldService.get().spawnTemplate({
        templateAsset: Assets.Product,
        position:      OFFSCREEN,
        networkMode:   NetworkMode.LocalOnly,
      }).catch((e) => {
        console.error(`[ProductPoolService] failed to spawn entity ${idx}`, e);
        return null;
      }),
    );

    const entities = await Promise.all(spawns);
    for (const entity of entities) {
      if (!entity) continue;
      const t = entity.getComponent(TransformComponent);
      if (t) this._available.push(t);
    }
  }

  /** Take a free entity from the pool. Returns null if the pool is empty. */
  claim(): Maybe<TransformComponent> {
    return this._available.pop() ?? null;
  }

  /** Return a previously claimed entity to the pool. */
  release(t: TransformComponent): void {
    t.worldPosition = OFFSCREEN;
    this._available.push(t);
  }

  get size(): number { return this._available.length; }
}
