/**
 * BallTrailService — One-dot-per-frame pooled trail behind the ball during flight.
 *
 * prewarm(): spawns TRAIL_POOL_SIZE sphere entities parked off-screen.
 *   Call once from GameManager alongside VfxService.prewarm().
 *
 * Each frame the ball is active, one dot is placed at the current ball position
 * at full ball diameter. Dots fade out (scale → 0, alpha → 0) over TRAIL_DOT_LIFE
 * seconds, producing a smooth ghost trail.
 *
 * When the pool is exhausted the oldest active dot is recycled — the trail simply
 * shortens instead of dropping frames.
 * Trail clears immediately when the ball goes idle.
 */
import {
  Service, service, subscribe,
  WorldService, NetworkMode, NetworkingService,
  Vec3, Quaternion,
  Color, ColorComponent, TransformComponent,
  OnWorldUpdateEvent,
} from 'meta/worlds';
import type { Entity, OnWorldUpdateEventPayload } from 'meta/worlds';
import { ExecuteOn } from 'meta/worlds';
import { Assets } from '../Assets';
import { BallService } from './BallService';
import { BALL_RADIUS, TRAIL_POOL_SIZE, TRAIL_EMIT_INTERVAL, TRAIL_DOT_LIFE } from '../Constants';

const PARK_POS = new Vec3(0, -100, 0);
const BALL_DIAMETER = BALL_RADIUS * 2;

// Trail dot color — soft white with slight blue tint
const TRAIL_R = 0.85;
const TRAIL_G = 0.90;
const TRAIL_B = 1.00;

interface ITrailDot {
  entity: Entity;
  age: number;
}

@service()
export class BallTrailService extends Service {

  // _free: entities not currently in use
  // _active: ordered oldest→newest; _active[0] is the oldest dot
  private _free: Entity[] = [];
  private _active: ITrailDot[] = [];
  private _emitTimer: number = 0;

  // ── Init ──────────────────────────────────────────────────────────

  async prewarm(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;

    const entities = await Promise.all(
      Array.from({ length: TRAIL_POOL_SIZE }, () =>
        WorldService.get().spawnTemplate({
          templateAsset: Assets.TrailDot,
          position:      PARK_POS,
          rotation:      Quaternion.identity,
          scale:         Vec3.one,
          networkMode:   NetworkMode.LocalOnly,
        }).catch(() => null),
      ),
    );

    for (const e of entities) {
      if (e) this._free.push(e);
    }
  }

  // ── Per-frame update ──────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    const dt  = payload.deltaTime;
    const ball = BallService.get();

    if (ball.active) {
      this._emitTimer -= dt;
      if (this._emitTimer <= 0) {
        this._emitTimer = TRAIL_EMIT_INTERVAL;
        this._emit(ball.posX, ball.posY, ball.posZ);
      }
    } else {
      // Ball went idle — clear all trail dots immediately
      if (this._active.length > 0) {
        for (const dot of this._active) this._park(dot.entity);
        this._free.push(...this._active.map(d => d.entity));
        this._active.length = 0;
      }
      this._emitTimer = 0;
    }

    // Age dots: fade scale (ball diameter → 0) and alpha (1 → 0)
    for (let i = this._active.length - 1; i >= 0; i--) {
      const dot = this._active[i];
      dot.age += dt;

      const frac = Math.max(0, (1 - dot.age / TRAIL_DOT_LIFE));

      const tc = dot.entity.getComponent(TransformComponent);
      if (tc) tc.localScale = Vec3.one.mul(BALL_DIAMETER * 0.5 * frac);

      const cc = dot.entity.getComponent(ColorComponent);
      if (cc) cc.color = new Color(TRAIL_R, TRAIL_G, TRAIL_B, frac * 0.4);

      if (dot.age >= TRAIL_DOT_LIFE) {
        this._park(dot.entity);
        this._free.push(dot.entity);
        this._active.splice(i, 1);
      }
    }
  }

  // ── Private helpers ───────────────────────────────────────────────

  private _emit(x: number, y: number, z: number): void {
    const entity = this._acquire();
    if (!entity) return;

    const tc = entity.getComponent(TransformComponent);
    if (tc) {
      tc.worldPosition = new Vec3(x, y, z);
      tc.localScale    = new Vec3(BALL_DIAMETER*0.5, BALL_DIAMETER*0.5, BALL_DIAMETER*0.5 );
    }

    const cc = entity.getComponent(ColorComponent);
    if (cc) cc.color = new Color(TRAIL_R, TRAIL_G, TRAIL_B, 0.2);

    for (const child of entity.getChildrenWithComponent(ColorComponent)) {
      const c = child.getComponent(ColorComponent);
      if (c) c.color = new Color(TRAIL_R, TRAIL_G, TRAIL_B, 0.2);
    }

    this._active.push({ entity, age: 0 });
  }

  /** Take from _free first; if exhausted, steal the oldest active dot. */
  private _acquire(): Entity | null {
    if (this._free.length > 0) {
      return this._free.pop()!;
    }
    if (this._active.length > 0) {
      // Oldest is at index 0 (insertion order)
      const oldest = this._active.shift()!;
      this._park(oldest.entity);
      return oldest.entity;
    }
    return null;
  }

  private _park(entity: Entity): void {
    const tc = entity.getComponent(TransformComponent);
    if (tc) tc.worldPosition = PARK_POS;
  }
}
