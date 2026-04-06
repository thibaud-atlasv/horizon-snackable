/**
 * ProjectilePool — Pre-spawned object pool for projectile entities.
 *
 * prewarm(): spawns PROJECTILE_POOL_SIZE entities at park position during game init.
 * acquire(): returns a parked entity from the pool (round-robin). Returns null if empty.
 * release(entity): moves entity back to park position, making it available again.
 * ProjectileController calls acquire() on fire and release() on hit or miss.
 * Pool size tuned in Constants.ts (PROJECTILE_POOL_SIZE).
 */
import { Service, WorldService, NetworkMode, Vec3, Quaternion, NetworkingService } from 'meta/worlds';
import { service } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { Assets } from '../Assets';
import { PROJECTILE_POOL_SIZE, PROJECTILE_POOL_Y, PROJECTILE_SCALE } from '../Constants';

// Parked projectiles are moved here between uses
export const POOL_PARK_POSITION = new Vec3(0, PROJECTILE_POOL_Y, 0);

@service()
export class ProjectilePool extends Service {
  private _free: Entity[] = [];

  // Called by GameManager.onStart — scene is guaranteed ready at that point
  async prewarm(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;
    const entities = await Promise.all(
      Array.from({ length: PROJECTILE_POOL_SIZE }, () =>
        WorldService.get().spawnTemplate({
          templateAsset: Assets.Projectile,
          position: POOL_PARK_POSITION,
          rotation: Quaternion.identity,
          scale: new Vec3(PROJECTILE_SCALE, PROJECTILE_SCALE, PROJECTILE_SCALE),
          networkMode: NetworkMode.LocalOnly,
        }).catch((e) => { console.error(e); return null; }),
      ),
    );
    for (const entity of entities) { if (entity) this._free.push(entity); }
  }

  // Returns a parked entity, or null if pool is exhausted
  acquire(): Entity | null {
    return this._free.pop() ?? null;
  }

  // ProjectileController calls this after moving the entity to POOL_PARK_POSITION
  release(entity: Entity): void {
    this._free.push(entity);
  }
}
