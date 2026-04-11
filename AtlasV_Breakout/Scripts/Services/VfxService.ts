/**
 * VfxService — Hit flash, impact particles, and death explosion VFX.
 *
 * Subscribes to TakeDamage: flashes enemy white for 80ms, spawns 3 impact particles.
 * Subscribes to EnemyDied: spawns 6 death explosion particles at death location.
 * Particles use a pre-warmed pool of Projectile entities (small spheres).
 * Each particle has velocity, gravity, lifetime, and fades/shrinks over time.
 * Force-instantiated in GameManager._startGame().
 */
import { Service, WorldService, NetworkMode, Vec3, Quaternion, Color, ColorComponent, TransformComponent, NetworkingService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { ExecuteOn } from 'meta/worlds';
import { Events } from '../Types';
import { Particle } from '../Assets';
import {
  PARTICLE_POOL_SIZE, TRAIL_POOL_SIZE,
  VFX_TRAIL_SCALE, VFX_TRAIL_LIFE,
  VFX_IMPACT_COUNT, VFX_PARTICLE_GRAVITY,
} from '../Constants';

const PARK_POS = new Vec3(0, -100, 0);
const WHITE = new Color(1, 1, 1, 1);

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
  a?: number;
  baseScale: number;
}

interface IFlash {
  enemyId: number;
  expiresAt: number;
  originalColors: Map<ColorComponent, Color>;
}

@service()
export class VfxService extends Service {
  private _pool: Entity[] = [];
  private _poolIndex: number = 0;
  private _particles: IParticle[] = [];
  private _flashes: IFlash[] = [];

  // ── Trail: dedicated circular pool (no splice, no sharing) ────────────────
  private _trailPool: Entity[] = [];
  private _trailIndex: number = 0;
  private _trailAges: Float32Array = new Float32Array(0);
  private _trailLifes: Float32Array = new Float32Array(0);
  private _trailScales: Float32Array = new Float32Array(0);
  private _trailR: Float32Array = new Float32Array(0);
  private _trailG: Float32Array = new Float32Array(0);
  private _trailB: Float32Array = new Float32Array(0);

  async prewarm(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;

    const totalCount = PARTICLE_POOL_SIZE + TRAIL_POOL_SIZE;
    const entities = await Promise.all(
      Array.from({ length: totalCount }, () =>
        WorldService.get().spawnTemplate({
          templateAsset: Particle,
          position: PARK_POS,
          rotation: Quaternion.identity,
          scale: new Vec3(0.08, 0.08, 0.08),
          networkMode: NetworkMode.LocalOnly,
        }).catch(() => null),
      ),
    );

    // First TRAIL_POOL_SIZE go to the trail pool, rest to general particles
    let trailCount = 0;
    let particleCount = 0;
    for (const e of entities) {
      if (!e) continue;
      if (trailCount < TRAIL_POOL_SIZE) {
        this._trailPool.push(e);
        trailCount++;
      } else {
        this._pool.push(e);
        particleCount++;
      }
    }

    // Init trail SOA buffers
    const n = this._trailPool.length;
    this._trailAges   = new Float32Array(n);
    this._trailLifes  = new Float32Array(n);
    this._trailScales = new Float32Array(n);
    this._trailR      = new Float32Array(n);
    this._trailG      = new Float32Array(n);
    this._trailB      = new Float32Array(n);
    // Mark all as expired
    this._trailAges.fill(999);
    this._trailLifes.fill(1);
  }

  // ── Trail ─────────────────────────────────────────────────────────────────

  spawnTrail(size: number, worldX: number, worldY: number, worldZ: number, r: number, g: number, b: number): void {
    if (this._trailPool.length === 0) return;

    const i = this._trailIndex;
    this._trailIndex = (i + 1) % this._trailPool.length;

    const entity = this._trailPool[i];
    const tc = entity.getComponent(TransformComponent);
    if (tc) {
      tc.worldPosition = new Vec3(worldX, worldY, worldZ);
      tc.localScale = new Vec3(VFX_TRAIL_SCALE, VFX_TRAIL_SCALE, VFX_TRAIL_SCALE);
    }
    const color = new Color(r, g, b, 0.8);
    const cc = entity.getComponent(ColorComponent);
    if (cc) cc.color = color;
    for (const child of entity.getChildrenWithComponent(ColorComponent)) {
      const c = child.getComponent(ColorComponent);
      if (c) c.color = color;
    }

    this._trailAges[i]   = 0;
    this._trailLifes[i]  = VFX_TRAIL_LIFE;
    this._trailScales[i] = size;
    this._trailR[i] = r;
    this._trailG[i] = g;
    this._trailB[i] = b;
  }

  // ── Public single particle spawn (used by JuiceService) ──────────────────

  spawnParticle(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    r: number, g: number, b: number, a :number,
    life: number, baseScale: number,
  ): void {
    const entity = this._acquireParticle();
    if (!entity) return;

    const tc = entity.getComponent(TransformComponent);
    if (tc) {
      tc.worldPosition = new Vec3(x, y, z);
      tc.localScale = new Vec3(baseScale, baseScale, baseScale);
    }
    const color = new Color(r, g, b, a);
    const cc = entity.getComponent(ColorComponent);
    if (cc) cc.color = color;
    for (const child of entity.getChildrenWithComponent(ColorComponent)) {
      const c = child.getComponent(ColorComponent);
      if (c) c.color = color;
    }

    this._particles.push({ entity, vx, vy, vz, age: 0, life, r, g, b, baseScale });
  }

  // ── Death explosion ───────────────────────────────────────────────────────

  @subscribe(Events.BrickDestroyed, { execution: ExecuteOn.Owner })
  onEnemyDied(p: Events.BrickDestroyedPayload): void {
    this._spawnImpactParticles(p.position.x, p.position.y, p.position.z, p.color.r, p.color.g, p.color.b);
  }

  // ── Update loop ───────────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    const dt = payload.deltaTime;
    const now = Date.now();

    // Update flash timers
    for (let i = this._flashes.length - 1; i >= 0; i--) {
      if (now >= this._flashes[i].expiresAt) {
        this._restoreColors(this._flashes[i].originalColors);
        this._flashes.splice(i, 1);
      }
    }

    // ── Trail pool update (no splice, pure circular) ─────────────────────
    for (let i = 0; i < this._trailPool.length; i++) {
      this._trailAges[i] += dt;
      if (this._trailAges[i] >= this._trailLifes[i]) {
        // Park expired trail particles
        const tc = this._trailPool[i].getComponent(TransformComponent);
        if (tc && tc.worldPosition.y > -50) {
          tc.worldPosition = PARK_POS;
        }
        continue;
      }
      const frac = Math.max(0, 1 - this._trailAges[i] / this._trailLifes[i]);
      const sc = this._trailScales[i] * frac;
      const entity = this._trailPool[i];
      const tc = entity.getComponent(TransformComponent);
      if (tc) tc.localScale = new Vec3(sc, sc, sc);
      // Fade alpha
      const alpha = 0.1 * frac;
      const cc = entity.getComponent(ColorComponent);
      if (cc) cc.color = new Color(this._trailR[i], this._trailG[i], this._trailB[i], alpha);
      for (const child of entity.getChildrenWithComponent(ColorComponent)) {
        const c = child.getComponent(ColorComponent);
        if (c) c.color = new Color(this._trailR[i], this._trailG[i], this._trailB[i], alpha);
      }
    }

    // ── General particles update ─────────────────────────────────────────
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.age += dt;
      p.vy -= VFX_PARTICLE_GRAVITY * dt;

      const tc = p.entity.getComponent(TransformComponent);
      if (tc) {
        const pos = tc.worldPosition;
        tc.worldPosition = new Vec3(pos.x + p.vx * dt, pos.y + p.vy * dt, pos.z + p.vz * dt);
        const frac = 1 - p.age / p.life;
        const sc = p.baseScale * Math.max(0, frac);
        tc.localScale = new Vec3(sc, sc, sc);
      }

      // Fade alpha
      const frac = (p.a ?? 1) * Math.max(0, 1 - p.age / p.life);
      const cc = p.entity.getComponent(ColorComponent);
      if (cc) cc.color = new Color(p.r, p.g, p.b, frac);
      for (const child of p.entity.getChildrenWithComponent(ColorComponent)) {
        const c = child.getComponent(ColorComponent);
        if (c) c.color = new Color(p.r, p.g, p.b, frac);
      }

      if (p.age >= p.life) {
        this._parkParticle(p.entity);
        this._particles.splice(i, 1);
      }
    }
  }

  @subscribe(Events.Restart)
  onRestart(_p: Events.RestartPayload): void {
    for (const p of this._particles) this._parkParticle(p.entity);
    // Park all trail particles
    for (let i = 0; i < this._trailPool.length; i++) {
      this._trailAges[i] = 999;
      this._parkParticle(this._trailPool[i]);
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private _spawnImpactParticles(worldX: number, worldY: number, worldZ: number, r: number, g: number, b: number): void {
    for (let i = 0; i < VFX_IMPACT_COUNT; i++) {
      const entity = this._acquireParticle();
      if (!entity) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 1.5;

      const tc = entity.getComponent(TransformComponent);
      if (tc) {
        tc.worldPosition = new Vec3(worldX, worldY, worldZ);
        tc.localScale = new Vec3(0.08, 0.08, 0.08);
      }
      const cc = entity.getComponent(ColorComponent);
      if (cc) cc.color = new Color(r, g, b, 1);
      for (const child of entity.getChildrenWithComponent(ColorComponent)) {
        const c = child.getComponent(ColorComponent);
        if (c) c.color = new Color(r, g, b, 1);
      }

      this._particles.push({
        entity,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 2 + Math.random() * 2,
        age: 0,
        life: 0.3 + Math.random() * 0.1,
        r, g, b,
        baseScale: 0.08,
      });
    }
  }

  private _acquireParticle(): Entity | null {
    if (this._pool.length === 0) return null;
    const entity = this._pool[this._poolIndex];
    this._poolIndex = (this._poolIndex + 1) % this._pool.length;

    // If this entity is still active, recycle it (remove from active list, park it)
    const activeIdx = this._particles.findIndex(p => p.entity === entity);
    if (activeIdx !== -1) {
      this._parkParticle(entity);
      this._particles.splice(activeIdx, 1);
    }

    return entity;
  }

  private _parkParticle(entity: Entity): void {
    const tc = entity.getComponent(TransformComponent);
    if (tc) tc.worldPosition = PARK_POS;
  }

  private _captureColors(entity: Entity): Map<ColorComponent, Color> {
    const map = new Map<ColorComponent, Color>();
    for (const child of entity.getChildren()) {
      const c = child.getComponent(ColorComponent);
      if (c) map.set(c, new Color(c.color.r, c.color.g, c.color.b, c.color.a));
      for (const [cc, col] of this._captureColors(child)) map.set(cc, col);
    }
    return map;
  }

  private _applyWhite(entity: Entity): void {
    for (const child of entity.getChildren()) {
      const c = child.getComponent(ColorComponent);
      if (c) c.color = WHITE;
      this._applyWhite(child);
    }
  }

  private _restoreColors(map: Map<ColorComponent, Color>): void {
    for (const [c, orig] of map) c.color = orig;
  }
}
