import {
  Color,
  ColorComponent,
  Component,
  NetworkingService,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  TransformComponent,
  Vec3,
  component,
  property,
  subscribe,
  type Entity,
} from 'meta/worlds';

import { HALF_W, WATER_SURFACE_Y, WATER_BOTTOM_Y } from '../Constants';

/**
 * AmbientFXController — animates god rays, floating particles, and seaweed.
 *
 * ── Editor setup ────────────────────────────────────────────────────────────────
 * Attach to a scene entity. Populate the three arrays in the inspector:
 *   godRayEntities  — 6 thin stretched cubes, upper water
 *   particleEntities— 28 tiny sphere meshes, throughout water column
 *   seaweedEntities — 8 tall thin cubes, anchored to sand layer
 *
 * All entities need TransformComponent + ColorComponent.
 */
@component()
export class AmbientFXController extends Component {

  @property() godRayEntities  : readonly Entity[] = [];
  @property() particleEntities: readonly Entity[] = [];
  @property() seaweedEntities : readonly Entity[] = [];

  // ── Per-entity animation state ────────────────────────────────────────────────
  private _rayPhase   : number[] = [];
  private _rayFreq    : number[] = [];
  private _rayAlphaMin: number[] = [];
  private _rayAlphaMax: number[] = [];

  private _partX    : number[] = [];
  private _partY    : number[] = [];
  private _partVX   : number[] = [];
  private _partVY   : number[] = [];
  private _partPhase: number[] = [];
  private _partDepth: number[] = [];  // 0=surface, 1=abyss (for alpha scaling)

  private _weedPhase: number[] = [];
  private _weedFreq : number[] = [];
  private _weedAmp  : number[] = [];

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._initGodRays();
    this._initParticles();
    this._initSeaweed();
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const dt = p.deltaTime;
    const t  = (p as any).worldTime ?? 0;
    this._animateGodRays(t);
    this._animateParticles(dt, t);
    this._animateSeaweed(t);
  }

  // ── God Rays ──────────────────────────────────────────────────────────────────
  private _initGodRays(): void {
    this.godRayEntities.forEach((e, i) => {
      if (!e) return;
      this._rayPhase[i]    = Math.random() * Math.PI * 2;
      this._rayFreq[i]     = 0.10 + Math.random() * 0.12;
      this._rayAlphaMin[i] = 0.04;
      this._rayAlphaMax[i] = 0.12;

      const x     = -HALF_W + (i + 0.5) * (HALF_W * 2 / this.godRayEntities.length) + (Math.random() - 0.5);
      const y     = WATER_SURFACE_Y - 0.5 - Math.random() * 1.5;
      const h     = 2.5 + Math.random() * 1.5;
      const tilt  = (Math.random() - 0.5) * 0.3; // slight Z rotation

      const tc = e.getComponent(TransformComponent);
      const cc = e.getComponent(ColorComponent);
      if (tc) {
        tc.localPosition = new Vec3(x, y, 0.05);
        tc.localScale    = new Vec3(0.12, h, 0.08);
        // tilt via local rotation z — approximated
      }
      if (cc) cc.color = new Color(1, 0.98, 0.92, this._rayAlphaMin[i]);
    });
  }

  private _animateGodRays(t: number): void {
    this.godRayEntities.forEach((e, i) => {
      const cc = e?.getComponent(ColorComponent);
      if (!cc) return;
      const alpha = this._rayAlphaMin[i] + (this._rayAlphaMax[i] - this._rayAlphaMin[i]) *
        (0.5 + 0.5 * Math.sin(t * this._rayFreq[i] + this._rayPhase[i]));
      cc.color = new Color(1, 0.98, 0.92, alpha);
    });
  }

  // ── Particles ─────────────────────────────────────────────────────────────────
  private _initParticles(): void {
    const waterH = WATER_SURFACE_Y - WATER_BOTTOM_Y;
    this.particleEntities.forEach((e, i) => {
      if (!e) return;
      const x     = -HALF_W + Math.random() * HALF_W * 2;
      const y     = WATER_BOTTOM_Y + Math.random() * waterH;
      const depth = 1 - (y - WATER_BOTTOM_Y) / waterH; // 0=surface, 1=deep

      this._partX[i]     = x;
      this._partY[i]     = y;
      this._partVX[i]    = (Math.random() - 0.5) * 0.08;
      this._partVY[i]    = (Math.random() - 0.5) * 0.04;
      this._partPhase[i] = Math.random() * Math.PI * 2;
      this._partDepth[i] = depth;

      const scale = 0.018 + Math.random() * 0.027;
      const tc    = e.getComponent(TransformComponent);
      const cc    = e.getComponent(ColorComponent);
      if (tc) { tc.localPosition = new Vec3(x, y, 0.1); tc.localScale = new Vec3(scale, scale, scale); }
      const alpha = (0.15 + Math.random() * 0.30) * (1 - depth * 0.6);
      if (cc) cc.color = new Color(0.75, 0.88, 1.0, alpha);
    });
  }

  private _animateParticles(dt: number, t: number): void {
    this.particleEntities.forEach((e, i) => {
      if (!e) return;
      this._partX[i] += this._partVX[i] * dt + Math.sin(t * 0.6 + this._partPhase[i]) * 0.002;
      this._partY[i] += this._partVY[i] * dt;

      // Wrap at screen edges
      if (this._partX[i] > HALF_W)  this._partX[i] -= HALF_W * 2;
      if (this._partX[i] < -HALF_W) this._partX[i] += HALF_W * 2;
      if (this._partY[i] > WATER_SURFACE_Y) this._partY[i] = WATER_BOTTOM_Y;
      if (this._partY[i] < WATER_BOTTOM_Y)  this._partY[i] = WATER_SURFACE_Y;

      const tc = e.getComponent(TransformComponent);
      if (tc) tc.localPosition = new Vec3(this._partX[i], this._partY[i], 0.1);
    });
  }

  // ── Seaweed ───────────────────────────────────────────────────────────────────
  private _initSeaweed(): void {
    this.seaweedEntities.forEach((e, i) => {
      if (!e) return;
      this._weedPhase[i] = Math.random() * Math.PI * 2;
      this._weedFreq[i]  = 0.18 + Math.random() * 0.17;
      this._weedAmp[i]   = 6 + Math.random() * 8; // degrees

      const x = -HALF_W + (i + 0.5) * (HALF_W * 2 / this.seaweedEntities.length) + (Math.random() - 0.5) * 0.5;
      const h = 0.30 + Math.random() * 0.40;
      const sandY = WATER_BOTTOM_Y + 0.5;

      const tc = e.getComponent(TransformComponent);
      const cc = e.getComponent(ColorComponent);
      if (tc) {
        tc.localPosition = new Vec3(x, sandY + h / 2, 0);
        tc.localScale    = new Vec3(0.08, h, 0.08);
      }
      if (cc) {
        const g = 0.25 + Math.random() * 0.08;
        cc.color = new Color(0.06, g, 0.12, 1);
      }
    });
  }

  private _animateSeaweed(t: number): void {
    this.seaweedEntities.forEach((e, i) => {
      const tc = e?.getComponent(TransformComponent);
      if (!tc) return;
      const angRad = (this._weedAmp[i] * Math.sin(t * this._weedFreq[i] + this._weedPhase[i])) * Math.PI / 180;
      // Apply Z rotation in-place (simple approach — set localRotation z component)
      const half = angRad / 2;
      tc.localRotation = { x: 0, y: 0, z: Math.sin(half), w: Math.cos(half) } as any;
    });
  }
}
