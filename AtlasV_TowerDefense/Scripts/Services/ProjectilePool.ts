import { Service, WorldService, NetworkMode, Vec3, Quaternion, NetworkingService } from 'meta/worlds';
import { service } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { Assets } from '../Assets';
import { PROJECTILE_POOL_SIZE, PROJECTILE_POOL_Y, PROJECTILE_SCALE } from '../Constants';

export const POOL_PARK_POSITION = new Vec3(0, PROJECTILE_POOL_Y, 0);

@service()
export class ProjectilePool extends Service {
  private _free: Entity[] = [];

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
        }).catch(() => null),
      ),
    );
    for (const entity of entities) { if (entity) this._free.push(entity); }
  }

  acquire(): Entity | null {
    return this._free.pop() ?? null;
  }

  release(entity: Entity): void {
    this._free.push(entity);
  }
}
