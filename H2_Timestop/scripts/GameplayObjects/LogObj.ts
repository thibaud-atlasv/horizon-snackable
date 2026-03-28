/**
 * LogObj — falling log component.
 *
 * Attach to: Templates/GameplayObjects/Log.hstf
 *
 * Lifecycle:
 *   1. Spawned by SpawnManager (ghost = visible but inactive).
 *   2. Events.InitFallingObj  → sets physics state, applies initial transform.
 *   3. Events.FallingObjActivate (matching objId) → starts falling.
 *   4. Events.FallingObjFreeze  (matching objId) → freezes, scores, fades, destroys.
 *   5. Floor hit → dispatches FallingObjHitFloor → game over.
 *
 * Physics:
 *   - Constant downward speed with gradual acceleration (LOG_ACCEL).
 *   - Angular rotation (torque) around an optionally off-center pivot.
 *   - Horizontal drift (vx) with hard or soft wall bounce.
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
  Quaternion,
  TransformComponent,
  Vec3,
  component,
  subscribe,
} from 'meta/worlds';
import {
  BOUNDS,
  BOUNCE_KICK_FULL,
  BOUNCE_KICK_SOFT,
  BOUNCE_TORQUE_ADD,
  BOUNCE_TORQUE_ADD_SOFT,
  BOUNCE_TORQUE_FLIP,
  BOUNCE_TORQUE_FLIP_SOFT,
  BOUNCE_VX_DAMP,
  BOUNCE_VY_DAMP,
  FLOOR_Y,
  FREEZE_FADE_MS,
  FREEZE_HOLD_MS,
  LOG_ACCEL,
  LOG_H,
} from '../Constants';
import { FallingObjRegistry } from '../LogRegistry';
import { calcScore, getPrecision } from '../Shared/FallingObjUtils';
import { Events, FallingObjType, GamePhase, type IFallingObj } from '../Types';

@component()
export class LogObj extends Component implements IFallingObj {

  // ── IFallingObj ───────────────────────────────────────────────────────────
  get objId():   number         { return this._objId; }
  get objType(): FallingObjType { return FallingObjType.Log; }
  waiting():     boolean        { return !this._launched; }

  // ── Identity ──────────────────────────────────────────────────────────────
  private _objId: number = -1;

  // ── Physics state ─────────────────────────────────────────────────────────
  private _cx:         number  = 0;
  private _cy:         number  = 0;
  private _vx:         number  = 0;
  private _angle:      number  = 0;   // radians, CCW
  private _torque:     number  = 0;   // rad/s
  private _pivotShift: number  = 0;   // fraction of half-width
  private _logW:       number  = 1;
  private _speed:      number  = 3;
  private _bounce:     boolean = false;

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

    this._objId      = p.objId;
    this._cx         = p.cx;
    this._cy         = p.startY;
    this._angle      = p.angle;
    this._torque     = p.torque;
    this._pivotShift = p.pivotShift;
    this._logW       = p.logW;
    this._speed      = p.speed;
    this._vx         = p.vx;
    this._bounce     = p.bounce;

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
      this._frozen = true;
      return;
    }

    this._applyTransform();
  }

  // ── IFallingObj ───────────────────────────────────────────────────────────

  getLowestY(): number {
    return Math.min(...this._getCorners().map(c => c.y));
  }

  // ── Physics ───────────────────────────────────────────────────────────────

  private _tick(dt: number): void {
    this._speed += LOG_ACCEL * dt;
    this._cy    -= this._speed * dt;
    this._angle += this._torque * dt;
    this._cx    += this._vx * dt;
    this._resolveWallBounce();
  }

  private _resolveWallBounce(): void {
    const corners = this._getCorners();
    const minX = Math.min(...corners.map(c => c.x));
    const maxX = Math.max(...corners.map(c => c.x));

    if (minX < BOUNDS.x) {
      this._cx    += (BOUNDS.x - minX);
      const kick   = this._bounce ? BOUNCE_KICK_FULL       : BOUNCE_KICK_SOFT;
      const tDamp  = this._bounce ? BOUNCE_TORQUE_FLIP     : BOUNCE_TORQUE_FLIP_SOFT;
      const tKick  = this._bounce ? BOUNCE_TORQUE_ADD      : BOUNCE_TORQUE_ADD_SOFT;
      this._vx     =  Math.abs(this._vx) * BOUNCE_VX_DAMP + kick;
      this._torque = -this._torque * tDamp + tKick;
      this._speed *= BOUNCE_VY_DAMP;
    } else if (maxX > BOUNDS.x + BOUNDS.w) {
      this._cx    -= (maxX - (BOUNDS.x + BOUNDS.w));
      const kick   = this._bounce ? BOUNCE_KICK_FULL       : BOUNCE_KICK_SOFT;
      const tDamp  = this._bounce ? BOUNCE_TORQUE_FLIP     : BOUNCE_TORQUE_FLIP_SOFT;
      const tKick  = this._bounce ? BOUNCE_TORQUE_ADD      : BOUNCE_TORQUE_ADD_SOFT;
      this._vx     = -(Math.abs(this._vx) * BOUNCE_VX_DAMP + kick);
      this._torque = -this._torque * tDamp - tKick;
      this._speed *= BOUNCE_VY_DAMP;
    }
  }

  private _applyTransform(): void {
    const pivotOffset = this._pivotShift * (this._logW / 2);
    const cos = Math.cos(this._angle);
    const sin = Math.sin(this._angle);
    this._transform.worldPosition = new Vec3(
      this._cx + pivotOffset * (1 - cos),
      this._cy - pivotOffset * sin,
      0,
    );
    this._transform.worldRotation = Quaternion.fromEuler(new Vec3(0, 0, this._angle * (180 / Math.PI)));
    this._transform.localScale    = new Vec3(this._logW, LOG_H, 0.1);
  }

  /**
   * Returns the four corners of the rotated log in world space (Y-up).
   * pivotShift offsets the rotation center along the log's local X axis.
   */
  private _getCorners(): Array<{ x: number; y: number }> {
    const hw = this._logW / 2;
    const hh = LOG_H / 2;
    const pivotOffset = this._pivotShift * hw;
    const pivotX = this._cx + pivotOffset;
    const cos = Math.cos(this._angle);
    const sin = Math.sin(this._angle);

    return (
      [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]] as Array<[number, number]>
    ).map(([lx, ly]) => {
      const rx = lx - pivotOffset;
      return { x: pivotX + rx * cos - ly * sin, y: this._cy + rx * sin + ly * cos };
    });
  }
}
