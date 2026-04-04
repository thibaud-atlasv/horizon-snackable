import { Service, WorldService, NetworkMode, Vec3, Quaternion, NetworkingService, EventService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { ExecuteOn } from 'meta/worlds';
import { Assets } from '../Assets';
import { Events } from '../Types';
import { EnemyService } from './EnemyService';
import { FLOATING_TEXT_POOL_SIZE, FLOATING_TEXT_PARK_Y } from '../Constants';

const PARK_POS = new Vec3(0, FLOATING_TEXT_PARK_Y, 0);

@service()
export class FloatingTextService extends Service {
  private _pool: Entity[] = [];
  private _poolIndex: number = 0;

  async prewarm(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;
    for (let i = 0; i < FLOATING_TEXT_POOL_SIZE; i++) {
      const entity = await WorldService.get().spawnTemplate({
        templateAsset: Assets.FloatingText,
        position: PARK_POS,
        scale: Vec3.one,
        networkMode: NetworkMode.LocalOnly,
      }).catch((e: unknown) => { console.error(e); return null; });
      if (entity) this._pool.push(entity);
    }
  }

  showCrit(worldX: number, worldZ: number, multiplier: number): void {
    if (this._pool.length === 0) return;
    const entity = this._pool[this._poolIndex];
    this._poolIndex = (this._poolIndex + 1) % this._pool.length;
    const p = new Events.ActivateFloatingTextPayload();
    p.text   = `x${multiplier}`;
    p.worldX = worldX;
    p.worldZ = worldZ;
    p.colorR = 1.0;
    p.colorG = 0.15;
    p.colorB = 0.15;
    EventService.sendLocally(Events.ActivateFloatingText, p, { eventTarget: entity });
  }

  show(worldX: number, worldZ: number, value: number): void {
    if (this._pool.length === 0) return;
    const entity = this._pool[this._poolIndex];
    this._poolIndex = (this._poolIndex + 1) % this._pool.length;
    const p = new Events.ActivateFloatingTextPayload();
    p.text   = `+${value}`;
    p.worldX = worldX;
    p.worldZ = worldZ;
    EventService.sendLocally(Events.ActivateFloatingText, p, { eventTarget: entity });
  }

  @subscribe(Events.TakeDamage, { execution: ExecuteOn.Owner })
  onTakeDamage(p: Events.TakeDamagePayload): void {
    if (!p.props['isCrit']) return;
    const multiplier = p.props['critMultiplier'] as number | undefined;
    if (multiplier === undefined) return;
    const rec = EnemyService.get().get(p.enemyId);
    if (rec) this.showCrit(rec.worldX, rec.worldZ, multiplier);
  }

  @subscribe(Events.EnemyDied, { execution: ExecuteOn.Owner })
  onEnemyDied(p: Events.EnemyDiedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this.show(p.worldX, p.worldZ, p.reward);
  }
}

