/**
 * ProjectileController — Homing projectile movement and hit pipeline detonation.
 *
 * Attached to: pooled projectile entities (managed by ProjectilePool).
 * onInit (InitProjectile event): sets target, damage, speed, props. Applies visual
 *   scale and color from props. Tracks last known enemy position for dead-target follow.
 * onUpdate: moves toward target position each frame. On arrival (PROJECTILE_HIT_RADIUS):
 *   - If target alive OR props.splashRadius > 0: calls _detonate() at current position.
 *   - If target dead and no splash: calls _return() silently.
 * _detonate(): calls HitService.resolve() to run all modifiers (SplashSystem, CritService),
 *   then sends TakeDamage to each resolved target with hitCtx.props (includes critHit etc).
 * _return(): parks entity back in ProjectilePool.
 */
import { Component, TransformComponent, EventService, Vec3, Color, ColorComponent } from 'meta/worlds';
import { component, subscribe } from 'meta/worlds';
import { OnEntityStartEvent, OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';
import { Events } from '../Types';
import { PROJECTILE_HIT_RADIUS } from '../Constants';
import { EnemyService } from '../Services/EnemyService';
import { HitService } from '../Services/HitService';
import { ProjectilePool, POOL_PARK_POSITION } from '../Services/ProjectilePool';

@component()
export class ProjectileController extends Component {
  private _transform!: TransformComponent;
  private _targetId: number = -1;
  private _damage: number = 0;
  private _speed: number = 0;
  private _props: Record<string, unknown> = {};
  private _active: boolean = false;
  private _destX: number = 0;
  private _destZ: number = 0;
  private _originX: number = 0;
  private _originZ: number = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
  }

  @subscribe(Events.InitProjectile)
  onInit(p: Events.InitProjectilePayload): void {
    this._targetId = p.targetEnemyId;
    this._damage   = p.damage;
    this._speed    = p.speed;
    this._props    = p.props;
    this._originX  = p.originX;
    this._originZ  = p.originZ;
    this._active   = true;
    const rec = EnemyService.get().get(p.targetEnemyId);
    if (rec) { this._destX = rec.worldX; this._destZ = rec.worldZ; }

    const scale = p.props['projectileScale'] as number | undefined;
    if (scale !== undefined) {
      const st = this.entity.getComponent(TransformComponent);
      if (st) st.localScale = new Vec3(scale, scale, scale);
    }

    const col = p.props['projectileColor'] as { r: number; g: number; b: number } | undefined;
    if (col) {
      const color = new Color(col.r, col.g, col.b, 1);
      const c = this.entity.getComponent(ColorComponent);
      if (c) c.color = color;
      for (const child of this.entity.getChildrenWithComponent(ColorComponent)) {
        const cc = child.getComponent(ColorComponent);
        if (cc) cc.color = color;
      }
    }
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._active) return;

    // Track target while alive; keep last known position when dead
    const target = EnemyService.get().get(this._targetId);
    if (target) {
      this._destX = target.worldX;
      this._destZ = target.worldZ;
    }

    const pos = this._transform.worldPosition;
    const dx = this._destX - pos.x;
    const dz = this._destZ - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= PROJECTILE_HIT_RADIUS) {
      const hasSplash = !!(this._props['splashRadius'] as number | undefined);
      // Detonate at last known position if splash; vanish silently if single-target and target is dead
      if (target || hasSplash) this._detonate(pos.x, pos.z);
      else this._return();
      return;
    }

    const step = this._speed * p.deltaTime;
    const norm = step / dist;
    this._transform.worldPosition = new Vec3(pos.x + dx * norm, pos.y, pos.z + dz * norm);
  }

  private _detonate(worldX: number, worldZ: number): void {
    const hitCtx = HitService.get().resolve({
      originX: worldX,
      originZ: worldZ,
      primaryTargetId: this._targetId,
      targets: [this._targetId],
      damage: this._damage,
      props: this._props,
    });

    for (const id of hitCtx.targets) {
      EventService.sendLocally(Events.TakeDamage,
        { enemyId: id, damage: hitCtx.damage, props: hitCtx.props, originX: this._originX, originZ: this._originZ });
    }

    this._return();
  }

  private _return(): void {
    this._active = false;
    this._transform.worldPosition = POOL_PARK_POSITION;
    ProjectilePool.get().release(this.entity);
  }
}
