/**
 * VfxService — Pooled particle bursts on shot outcomes.
 *
 * prewarm(): spawns VFX_POOL_SIZE particle entities and parks them off-screen.
 *   Call once from GameManager after spawning entities.
 *
 * Subscribes to ShotFeedbackResultEvent:
 *   Goal    → golden confetti burst at ball position inside the net
 *   Save    → white/blue particles at GK zone (goal mouth centre)
 *   PostHit → white sparks at post impact point
 *   Miss    → grey dust puff at ball ground position
 *
 * Each particle has velocity, gravity, lifetime, and shrinks/fades over time.
 * Entirely client-side. No networking concerns.
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
import { ShotFeedbackResultEvent, ShotFeedbackResultPayload } from '../Events/ShotFeedbackEvents';
import { ShotOutcome } from '../Types';
import { Assets } from '../Assets';
import { BallService } from './BallService';
import {
  VFX_POOL_SIZE, VFX_GRAVITY,
  VFX_GOAL_COUNT, VFX_GOAL_SPEED_MIN, VFX_GOAL_SPEED_MAX, VFX_GOAL_LIFE, VFX_GOAL_SCALE,
  VFX_SAVE_COUNT, VFX_SAVE_SPEED_MIN, VFX_SAVE_SPEED_MAX, VFX_SAVE_LIFE, VFX_SAVE_SCALE,
  VFX_POST_COUNT, VFX_POST_SPEED_MIN, VFX_POST_SPEED_MAX, VFX_POST_LIFE, VFX_POST_SCALE,
  VFX_MISS_COUNT, VFX_MISS_SPEED_MIN, VFX_MISS_SPEED_MAX, VFX_MISS_LIFE, VFX_MISS_SCALE,
} from '../Constants';

const PARK_POS = new Vec3(0, -100, 0);

interface IParticle {
  entity: Entity;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  r: number;
  g: number;
  b: number;
  baseScale: number;
}

@service()
export class VfxService extends Service {

  private _pool: Entity[] = [];
  private _poolIndex: number = 0;
  private _active: IParticle[] = [];

  // ── Init ──────────────────────────────────────────────────────────

  async prewarm(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;

    const entities = await Promise.all(
      Array.from({ length: VFX_POOL_SIZE }, () =>
        WorldService.get().spawnTemplate({
          templateAsset: Assets.Particle,
          position:    PARK_POS,
          rotation:    Quaternion.identity,
          scale:       new Vec3(0.1, 0.1, 0.1),
          networkMode: NetworkMode.LocalOnly,
        }).catch(() => null),
      ),
    );

    for (const e of entities) {
      if (e) this._pool.push(e);
    }
  }

  // ── Event handlers ────────────────────────────────────────────────

  @subscribe(ShotFeedbackResultEvent)
  onShotResult(p: ShotFeedbackResultPayload): void {
    const ball = BallService.get();

    switch (p.outcome as ShotOutcome) {
      case ShotOutcome.Goal:
        // Golden confetti inside the net
        this._burst(
          ball.posX, ball.posY, ball.posZ,
          VFX_GOAL_COUNT, VFX_GOAL_SPEED_MIN, VFX_GOAL_SPEED_MAX, VFX_GOAL_LIFE, VFX_GOAL_SCALE,
          GOAL_COLORS,
        );
        break;

      case ShotOutcome.Save:
        // White/blue particles at goalkeeper zone
        this._burst(
          0, 1.0, 0.8,
          VFX_SAVE_COUNT, VFX_SAVE_SPEED_MIN, VFX_SAVE_SPEED_MAX, VFX_SAVE_LIFE, VFX_SAVE_SCALE,
          SAVE_COLORS,
        );
        break;

      case ShotOutcome.PostHit:
        // White sparks at ball position (near post/crossbar)
        this._burst(
          ball.posX, ball.posY, ball.posZ,
          VFX_POST_COUNT, VFX_POST_SPEED_MIN, VFX_POST_SPEED_MAX, VFX_POST_LIFE, VFX_POST_SCALE,
          POST_COLORS,
        );
        break;

      case ShotOutcome.Miss:
        // Dust puff on the ground at ball position
        this._burst(
          ball.posX, 0.05, ball.posZ,
          VFX_MISS_COUNT, VFX_MISS_SPEED_MIN, VFX_MISS_SPEED_MAX, VFX_MISS_LIFE, VFX_MISS_SCALE,
          MISS_COLORS,
        );
        break;
    }
  }

  // ── Per-frame update ──────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    const dt = payload.deltaTime;

    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];
      p.age += dt;

      // Gravity
      p.vy -= VFX_GRAVITY * dt;

      const tc = p.entity.getComponent(TransformComponent);
      if (tc) {
        const pos = tc.worldPosition;
        tc.worldPosition = new Vec3(pos.x + p.vx * dt, pos.y + p.vy * dt, pos.z + p.vz * dt);
        const frac = Math.max(0, 1 - p.age / p.life);
        const sc   = p.baseScale * frac;
        tc.localScale = new Vec3(sc, sc, sc);
      }

      const frac = Math.max(0, 1 - p.age / p.life);
      const cc   = p.entity.getComponent(ColorComponent);
      if (cc) cc.color = new Color(p.r, p.g, p.b, frac);
      for (const child of p.entity.getChildrenWithComponent(ColorComponent)) {
        const c = child.getComponent(ColorComponent);
        if (c) c.color = new Color(p.r, p.g, p.b, frac);
      }

      if (p.age >= p.life) {
        this._park(p.entity);
        this._active.splice(i, 1);
      }
    }
  }

  // ── Private helpers ───────────────────────────────────────────────

  private _burst(
    x: number, y: number, z: number,
    count: number, speedMin: number, speedMax: number,
    life: number, scale: number,
    palette: ReadonlyArray<[number, number, number]>,
  ): void {
    for (let i = 0; i < count; i++) {
      const entity = this._acquire();
      if (!entity) break;

      // Random direction on the unit sphere
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const vx    = Math.sin(phi) * Math.cos(theta) * speed;
      const vy    = Math.abs(Math.sin(phi) * Math.sin(theta)) * speed; // bias upward
      const vz    = Math.cos(phi) * speed;

      const [r, g, b] = palette[Math.floor(Math.random() * palette.length)];

      const tc = entity.getComponent(TransformComponent);
      if (tc) {
        tc.worldPosition = new Vec3(x, y, z);
        tc.localScale    = new Vec3(scale, scale, scale);
      }
      const cc = entity.getComponent(ColorComponent);
      if (cc) cc.color = new Color(r, g, b, 1);
      for (const child of entity.getChildrenWithComponent(ColorComponent)) {
        const c = child.getComponent(ColorComponent);
        if (c) c.color = new Color(r, g, b, 1);
      }

      this._active.push({ entity, vx, vy, vz, age: 0, life, r, g, b, baseScale: scale });
    }
  }

  private _acquire(): Entity | null {
    if (this._pool.length === 0) return null;
    const entity = this._pool[this._poolIndex];
    this._poolIndex = (this._poolIndex + 1) % this._pool.length;

    // Recycle if still active
    const idx = this._active.findIndex(p => p.entity === entity);
    if (idx !== -1) {
      this._park(entity);
      this._active.splice(idx, 1);
    }

    return entity;
  }

  private _park(entity: Entity): void {
    const tc = entity.getComponent(TransformComponent);
    if (tc) tc.worldPosition = PARK_POS;
  }
}

// ── Colour palettes ───────────────────────────────────────────────────────────

const GOAL_COLORS: ReadonlyArray<[number, number, number]> = [
  [1.00, 0.84, 0.00], // gold
  [1.00, 1.00, 0.20], // yellow
  [1.00, 0.50, 0.00], // orange
  [1.00, 1.00, 1.00], // white
  [0.20, 0.90, 0.20], // green (pitch colour)
];

const SAVE_COLORS: ReadonlyArray<[number, number, number]> = [
  [1.00, 1.00, 1.00], // white
  [0.40, 0.70, 1.00], // light blue
  [0.60, 0.80, 1.00], // sky blue
];

const POST_COLORS: ReadonlyArray<[number, number, number]> = [
  [1.00, 1.00, 1.00], // white
  [0.90, 0.90, 0.90], // light grey
  [1.00, 0.95, 0.70], // warm white
];

const MISS_COLORS: ReadonlyArray<[number, number, number]> = [
  [0.55, 0.45, 0.30], // dirt brown
  [0.70, 0.65, 0.55], // sandy
  [0.40, 0.55, 0.30], // grass green
];
