/**
 * BallObj — falling ball component.
 *
 * Attach to: Templates/GameplayObjects/Ball.hstf
 *
 * Lifecycle:
 *   1. Spawned by SpawnManager (ghost = visible but inactive).
 *   2. Events.InitFallingObj  → sets physics state, applies initial transform.
 *   3. Events.FallingObjActivate (matching objId) → starts falling.
 *   4. Events.FallingObjFreeze  (matching objId) → freezes, scores, fades, destroys.
 *   5. Floor hit → dispatches FallingObjHitFloor → game over.
 *
 * Physics:
 *   - Downward acceleration (gravity model: vy += ay * dt).
 *   - Horizontal drift (vx) with elastic wall bounce (no rotation).
 *   - Scale set from ballRadius so the mesh fills the collision sphere.
 */

import {
  Color,
  ColorComponent,
  Component,
  EventService,
  ExecuteOn,
  NetworkingService,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  TransformComponent,
  Vec3,
  component,
  subscribe,
} from 'meta/worlds';
import {
  BALL_BOUNCE_DAMPING,
  BALL_GRAVITY,
  BALL_RADIUS_MIN,
  BALL_RADIUS_MAX,
  BALL_VX_MIN,
  BALL_VX_MAX,
  BALL_VY_INIT,
  BOUNDS,
  FLOOR_Y,
  FREEZE_FADE_MS,
  FREEZE_HOLD_MS,
  START_Y,
  TOTAL_ROUNDS,
} from '../Constants';
import { FallingObjRegistry } from '../LogRegistry';
import { calcScore, getPrecision } from '../Shared/FallingObjUtils';
import { Events, FallingObjType, GamePhase, type IFallingObj } from '../Types';

@component()
export class BallObj extends Component implements IFallingObj {

  // ── IFallingObj ───────────────────────────────────────────────────────────
  get objId():   number         { return this._objId; }
  get objType(): FallingObjType { return FallingObjType.Ball; }
  waiting():     boolean        { return !this._launched; }

  // ── Identity ──────────────────────────────────────────────────────────────
  private _objId: number = -1;

  // ── Physics state ─────────────────────────────────────────────────────────
  private _cx:         number = 0;
  private _cy:         number = 0;
  private _vx:         number = 0;
  private _vy:         number = 0;   // vertical velocity (wu/s, negative = downward)
  private _ay:         number = 0;   // gravity (wu/s², negative)
  private _ballRadius: number = 0.5;

  // ── Runtime flags ─────────────────────────────────────────────────────────
  private _initialized: boolean = false;
  private _frozen:      boolean = false;
  private _launched:    boolean = false;
  private _paused:      boolean = false;
  private _fading:      boolean = false;
  private _fadeElapsed: number  = 0;

  // ── Components ────────────────────────────────────────────────────────────
  private _transform!: TransformComponent;
  private _colorComp!: ColorComponent;
  private _baseR: number = 1;
  private _baseG: number = 1;
  private _baseB: number = 1;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
    this._colorComp = this.entity.getComponent(ColorComponent)!;
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  @subscribe(Events.InitFallingObj)
  onInitFallingObj(p: Events.InitFallingObjPayload): void {
    if (this._initialized) return;
    this._initialized = true;
    this._launched    = false;

    this._objId = p.objId;
    this._cx    = this._transform.worldPosition.x;
    this._cy    = START_Y;
    this._ay    = -BALL_GRAVITY;
    this._vy    = BALL_VY_INIT;

    // Difficulty scaling from round index
    const vxScale    = 0.6 + (p.roundIndex / (TOTAL_ROUNDS - 1)) * 0.4;

    // Per-object randomization
    const vxSign     = Math.random() < 0.5 ? 1 : -1;
    this._ballRadius = BALL_RADIUS_MIN + Math.random() * (BALL_RADIUS_MAX - BALL_RADIUS_MIN);
    this._vx         = vxSign * (BALL_VX_MIN + Math.random() * (BALL_VX_MAX - BALL_VX_MIN)) * vxScale;

    this._applyTransform();
    FallingObjRegistry.get().register(this);
  }

  // ── Activation ────────────────────────────────────────────────────────────

  @subscribe(Events.FallingObjActivate)
  onActivate(p: Events.FallingObjActivatePayload): void {
    if (!this._initialized || p.objId !== this._objId) return;
    this._launched = true;
  }

  // ── Phase ─────────────────────────────────────────────────────────────────

  @subscribe(Events.PhaseChanged)
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    this._paused = (p.phase !== GamePhase.Falling);
  }

  // ── Restart ───────────────────────────────────────────────────────────────

  @subscribe(Events.Restart)
  onRestart(_p: Events.RestartPayload): void {
    this.entity.destroy();
  }

  // ── Freeze ────────────────────────────────────────────────────────────────

  @subscribe(Events.FallingObjFreeze)
  onFreeze(p: Events.FallingObjFreezePayload): void {
    if (p.objId !== this._objId || this._frozen) return;
    this._frozen = true;
    FallingObjRegistry.get().unregister(this._objId);

    const { pts, grade } = calcScore(getPrecision(this.getLowestY()));
    EventService.sendLocally(Events.FallingObjFrozen, {
      objId: this._objId, pts, grade, lowestY: this.getLowestY(),
    });

    const c = this._colorComp.color;
    this._baseR = c.r; this._baseG = c.g; this._baseB = c.b;
    setTimeout(() => { this._fading = true; this._fadeElapsed = 0; }, FREEZE_HOLD_MS);
  }

  // ── Update loop ───────────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._initialized) return;
    const dt = payload.deltaTime;

    if (this._fading) {
      this._fadeElapsed += dt * 1000;
      const alpha = 1 - Math.min(this._fadeElapsed / FREEZE_FADE_MS, 1);
      this._colorComp.color = new Color(this._baseR, this._baseG, this._baseB, alpha);
      if (alpha <= 0) this.entity.destroy();
      return;
    }

    if (this._frozen || this._paused || !this._launched) return;

    this._tick(dt);

    if (this.getLowestY() <= FLOOR_Y) {
      EventService.sendLocally(Events.FallingObjHitFloor, {});
      this._colorComp.color = Color.red;
      this._frozen = true;
      return;
    }

    this._applyTransform();
  }

  // ── IFallingObj ───────────────────────────────────────────────────────────

  getLowestY(): number {
    return this._cy - this._ballRadius;
  }

  // ── Physics ───────────────────────────────────────────────────────────────

  private _tick(dt: number): void {
    this._vy += this._ay * dt;
    this._cy += this._vy * dt;
    this._cx += this._vx * dt;
    this._resolveWallBounce();
  }

  private _resolveWallBounce(): void {
    const left  = BOUNDS.x;
    const right = BOUNDS.x + BOUNDS.w;

    if (this._cx - this._ballRadius < left) {
      this._cx = left + this._ballRadius;
      this._vx = Math.abs(this._vx) * BALL_BOUNCE_DAMPING;
    } else if (this._cx + this._ballRadius > right) {
      this._cx = right - this._ballRadius;
      this._vx = -Math.abs(this._vx) * BALL_BOUNCE_DAMPING;
    }
  }

  private _applyTransform(): void {
    const d = this._ballRadius * 2;
    this._transform.worldPosition = new Vec3(this._cx, this._cy, 0);
    this._transform.localScale    = new Vec3(d, d, d);
  }
}
