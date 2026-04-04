import { Component, TransformComponent, Vec3, Quaternion, EventService } from 'meta/worlds';
import type { Entity, Maybe } from 'meta/worlds';
import { component, property, subscribe } from 'meta/worlds';
import { OnEntityStartEvent, OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';
import { Events, type ITowerStats } from '../Types';
import { TargetingService } from '../Services/TargetingService';
import { EnemyService } from '../Services/EnemyService';
import { TowerService } from '../Services/TowerService';
import { ProjectilePool } from '../Services/ProjectilePool';

@component()
export class TowerController extends Component {
  private _transform!: TransformComponent;
  private _col: number = 0;
  private _row: number = 0;
  private _cooldown: number = 0;
  private _ready: boolean = false;
  private _stats: ITowerStats = { damage: 0, range: 0, fireRate: 1, projectileSpeed: 1, props: {} };

  @property() barrel: Maybe<Entity> = null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
  }

  @subscribe(Events.InitTower)
  onInit(p: Events.InitTowerPayload): void {
    this._col      = p.col;
    this._row      = p.row;
    this._cooldown = 0;
    this._ready    = true;
    this._refreshStats();
  }

  @subscribe(Events.TowerUpgraded)
  onTowerUpgraded(p: Events.TowerUpgradedPayload): void {
    if (p.col === this._col && p.row === this._row) this._refreshStats();
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._ready) return;

    const dt = p.deltaTime;
    if (this._cooldown > 0) this._cooldown -= dt;

    const pos = this._transform.worldPosition;
    const targetId = TargetingService.get().getBestTarget(pos.x, pos.z, this._stats.range);
    if (targetId === -1) return;

    if (this.barrel) {
      const target = EnemyService.get().get(targetId);
      if (target) {
        const barrelT = this.barrel.getComponent(TransformComponent);
        if (barrelT) barrelT.lookAt(new Vec3(target.worldX, barrelT.worldPosition.y, target.worldZ), Vec3.up);
      }
    }

    if (this._cooldown > 0) return;

    const entity = ProjectilePool.get().acquire();
    if (!entity) return;

    this._cooldown = 1 / this._stats.fireRate;

    const spawnPos = this.barrel
      ? (this.barrel.getComponent(TransformComponent)?.worldPosition ?? pos)
      : pos;
    const t = entity.getComponent(TransformComponent);
    if (t) t.worldPosition = spawnPos;

    const initP = new Events.InitProjectilePayload();
    initP.targetEnemyId = targetId;
    initP.damage        = this._stats.damage;
    initP.speed         = this._stats.projectileSpeed;
    initP.props         = this._stats.props;
    EventService.sendLocally(Events.InitProjectile, initP, { eventTarget: entity });
  }

  private _refreshStats(): void {
    const stats = TowerService.get().getEffectiveStats(this._col, this._row);
    if (stats) this._stats = stats;
  }
}
