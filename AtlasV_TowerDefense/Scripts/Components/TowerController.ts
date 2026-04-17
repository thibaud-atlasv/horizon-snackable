/**
 * TowerController — Per-frame targeting and firing logic for placed tower entities.
 *
 * Attached to: every spawned tower entity template.
 * onInit (InitTower event): reads ITowerDef from TowerService, stores col/row.
 * onUpdate: calls TargetingService.getBestTarget() each frame. Fires a projectile when
 *   cooldown expires and a target is in range. Acquires projectile from ProjectilePool,
 *   positions it at the tower base, sends InitProjectile to it.
 * Stats (damage, range, fireRate) are read live via TowerService.computeStats() so
 *   upgrades apply immediately without reinitializing the component.
 * Does NOT handle hit resolution — that is ProjectileController's responsibility.
 */
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

// ── Bounce animation constants ───────────────────────────────────────────────
const BOUNCE_DURATION = 0.35;  // total bounce time in seconds
const BOUNCE_OVERSHOOT = 1.25; // peak scale multiplier

@component()
export class TowerController extends Component {
  private _transform!: TransformComponent;
  private _col: number = 0;
  private _row: number = 0;
  private _cooldown: number = 0;
  private _ready: boolean = false;
  private _stats: ITowerStats = { damage: 0, range: 0, fireRate: 1, projectileSpeed: 1, props: {} };
  private _bouncing: boolean = false;
  private _bounceElapsed: number = 0;

  @property() barrel: Maybe<Entity> = null;
  // Set to 90 if the barrel mesh forward is +X instead of -Z, -90 for -X, etc.
  @property() barrelForwardOffsetDeg: number = 0;

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
    this._bouncing = true;
    this._bounceElapsed = 0;
    this._transform.localScale = Vec3.zero;
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

    // Bounce animation: scale 0 → overshoot → settle at CELL_SIZE
    if (this._bouncing) {
      this._bounceElapsed += dt;
      const t = Math.min(this._bounceElapsed / BOUNCE_DURATION, 1);
      // Ease-out elastic: overshoot then settle
      const s = t < 0.5
        ? BOUNCE_OVERSHOOT * (t / 0.5)               // 0 → overshoot
        : BOUNCE_OVERSHOOT + (1 - BOUNCE_OVERSHOOT) * ((t - 0.5) / 0.5); // overshoot → 1
      const scale = s;
      this._transform.localScale = new Vec3(scale, scale, scale);
      if (t >= 1) {
        this._bouncing = false;
        this._transform.localScale = new Vec3(scale, scale, scale);
      }
    }

    if (this._cooldown > 0) this._cooldown -= dt;

    const pos = this._transform.worldPosition;
    const targetId = TargetingService.get().getBestTarget(pos.x, pos.z, this._stats.range);
    if (targetId === -1) return;

    if (this.barrel) {
      const target = EnemyService.get().get(targetId);
      if (target) {
        const barrelT = this.barrel.getComponent(TransformComponent);
        if (barrelT) {
          const bPos = barrelT.worldPosition;
          const dx = target.worldX - bPos.x;
          const dz = target.worldZ - bPos.z;
          // atan2 in RUB: forward is -Z, so yaw = atan2(dx, -dz) converted to degrees
          const yawDeg = Math.atan2(dx, -dz) * (180 / Math.PI) + this.barrelForwardOffsetDeg;
          barrelT.localRotation = Quaternion.fromEuler(new Vec3(0, yawDeg, 0));
        }
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
    initP.originX       = spawnPos.x;
    initP.originZ       = spawnPos.z;
    EventService.sendLocally(Events.InitProjectile, initP, { eventTarget: entity });
  }

  private _refreshStats(): void {
    const stats = TowerService.get().getEffectiveStats(this._col, this._row);
    if (stats) this._stats = stats;
  }
}
