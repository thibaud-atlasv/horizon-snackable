import {
  EventService,
  ExecuteOn,
  NetworkingService,
  OnServiceReadyEvent,
  OnWorldUpdateEvent,
  Service,
  service,
  subscribe,
  type Maybe,
  type OnWorldUpdateEventPayload,
} from 'meta/worlds';
import {
  BOUNDS,
  WIDTH,
  HEIGHT,
  BOUNCE_KICK_FULL,
  BOUNCE_KICK_SOFT,
  BOUNCE_TORQUE_ADD,
  BOUNCE_TORQUE_ADD_SOFT,
  BOUNCE_TORQUE_FLIP,
  BOUNCE_TORQUE_FLIP_SOFT,
  BOUNCE_VX_DAMP,
  BOUNCE_VY_DAMP,
  FLOOR_Y,
  LOG_ACCEL,
  LOG_H,
  LOG_W_MIN,
  LOG_W_MAX,
  MAX_ANGLE_DEG,
  MAX_PIVOT,
  MAX_TORQUE_DEG,
  SPEED_BASE,
  SPEED_INC_PER_ROUND,
  START_Y,
  TOTAL_ROUNDS,
  VX_INIT_MAX,
  VX_INIT_MIN,
} from '../Constants';
import { calcScore, getPrecision } from '../Utils';
import {
  Events,
  FallingObjType,
  GamePhase,
  type FallingObjRenderState,
  type IFallingObj,
} from '../Types';

// Must match FallingObjCanvas canvas dimensions.
const CANVAS_W = 1920;
const CANVAS_H = 3640;

// ── Log simulation ────────────────────────────────────────────────────────────

class LogSim implements IFallingObj {
  readonly objType = FallingObjType.Log;

  readonly objId:   number;
  cx:               number;
  cy:               number = START_Y;
  angle:            number = 0;   // radians CCW
  logW:             number = 1;
  private _vx:         number  = 0;
  private _torque:     number  = 0;   // rad/s
  private _pivotShift: number  = 0;   // fraction of half-width
  private _speed:      number  = 3;
  private _bounce:     boolean = false;
  private _launched:   boolean = false;
  private _dead:       boolean = false;

  constructor(objId: number, cx: number, roundIndex: number, config: Record<string, unknown>) {
    this.objId  = objId;
    this.cx     = cx;
    this._speed  = SPEED_BASE + roundIndex * SPEED_INC_PER_ROUND;
    this._bounce = !!config['bounce'];

    const vxScale    = 0.6 + (roundIndex / (TOTAL_ROUNDS - 1)) * 0.4;
    const angleSign  = Math.random() < 0.5 ? 1 : -1;
    const torqueSign = Math.random() < 0.5 ? 1 : -1;
    const vxSign     = Math.random() < 0.5 ? 1 : -1;
    this.logW        = LOG_W_MIN + Math.random() * (LOG_W_MAX - LOG_W_MIN);
    this.angle       = angleSign  * (Math.random() * MAX_ANGLE_DEG  * 0.8 + 8) * (Math.PI / 180);
    this._torque     = torqueSign * (Math.random() * (MAX_TORQUE_DEG - 40) + 40) * (Math.PI / 180);
    this._pivotShift = config['pivot'] ? (Math.random() * 2 - 1) * MAX_PIVOT : 0;
    this._vx         = vxSign * (VX_INIT_MIN + Math.random() * (VX_INIT_MAX - VX_INIT_MIN)) * vxScale;
  }

  waiting(): boolean  { return !this._launched; }
  isFrozen(): boolean { return this._dead; }
  isDead():   boolean { return this._dead; }

  activate(): void { this._launched = true; }

  freeze(): void { this._dead = true; }

  tick(dt: number): void {
    if (this._dead || !this._launched) return;

    this._speed += LOG_ACCEL * dt;
    this.cy     -= this._speed * dt;
    this.angle  += this._torque * dt;
    this.cx     += this._vx * dt;
    this._resolveWallBounce();
  }

  getLowestY(): number {
    return Math.min(...this._getCorners().map(c => c.y));
  }

  getWorldX(): number { return this.cx; }

  toRenderState(): FallingObjRenderState {
    const pivotOffset = this._pivotShift * (this.logW / 2);
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    return {
      objId:    this.objId,
      type:     FallingObjType.Log,
      cx:       this.cx + pivotOffset * (1 - cos),
      cy:       this.cy - pivotOffset * sin,
      angle:    this.angle,
      scaleX:   this.logW,
      scaleY:   LOG_H,
      alpha:    1,
      launched: this._launched,
    };
  }

  private _resolveWallBounce(): void {
    const corners = this._getCorners();
    const minX = Math.min(...corners.map(c => c.x));
    const maxX = Math.max(...corners.map(c => c.x));

    if (minX < BOUNDS.x) {
      this.cx     += (BOUNDS.x - minX);
      const kick   = this._bounce ? BOUNCE_KICK_FULL       : BOUNCE_KICK_SOFT;
      const tDamp  = this._bounce ? BOUNCE_TORQUE_FLIP     : BOUNCE_TORQUE_FLIP_SOFT;
      const tKick  = this._bounce ? BOUNCE_TORQUE_ADD      : BOUNCE_TORQUE_ADD_SOFT;
      this._vx     =  Math.abs(this._vx) * BOUNCE_VX_DAMP + kick;
      this._torque = -this._torque * tDamp + tKick;
      this._speed *= BOUNCE_VY_DAMP;
    } else if (maxX > BOUNDS.x + BOUNDS.w) {
      this.cx     -= (maxX - (BOUNDS.x + BOUNDS.w));
      const kick   = this._bounce ? BOUNCE_KICK_FULL       : BOUNCE_KICK_SOFT;
      const tDamp  = this._bounce ? BOUNCE_TORQUE_FLIP     : BOUNCE_TORQUE_FLIP_SOFT;
      const tKick  = this._bounce ? BOUNCE_TORQUE_ADD      : BOUNCE_TORQUE_ADD_SOFT;
      this._vx     = -(Math.abs(this._vx) * BOUNCE_VX_DAMP + kick);
      this._torque = -this._torque * tDamp - tKick;
      this._speed *= BOUNCE_VY_DAMP;
    }
  }

  private _getCorners(): Array<{ x: number; y: number }> {
    const hw = this.logW / 2;
    const hh = LOG_H / 2;
    const pivotOffset = this._pivotShift * hw;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    // Rotation in pixel space to match the renderer (pixels are non-square:
    // PX_PER_WU differs on X vs Y). Convert local coords to px, rotate, convert back.
    const sx = CANVAS_W / WIDTH;
    const sy = CANVAS_H / HEIGHT;

    return (
      [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]] as Array<[number, number]>
    ).map(([lx, ly]) => {
      const rx = lx - pivotOffset;
      // to px
      const pxLoc =  rx * sx;
      const pyLoc = -ly * sy;  // Y-down in canvas
      // rotate
      const pxRot = pxLoc * cos - pyLoc * sin;
      const pyRot = pxLoc * sin + pyLoc * cos;
      // back to world
      return {
        x: this.cx + pivotOffset + pxRot / sx,
        y: this.cy + pyRot / sy,
      };
    });
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

@service()
export class FallingObjService extends Service {

  private _sims:   Map<number, LogSim>    = new Map();
  private _balls:  Map<number, IFallingObj> = new Map();
  private _paused:       boolean      = false;
  private _faultedObjId: Maybe<number> = null;

  @subscribe(OnServiceReadyEvent)
  onReady(): void {}

  // ── Simulation registry ───────────────────────────────────────────────────

  registerLog(sim: LogSim): void {
    this._sims.set(sim.objId, sim);
  }

  // Entity-based types (Ball, etc.) register here.
  registerBall(obj: IFallingObj): void {
    this._balls.set(obj.objId, obj);
  }

  unregister(objId: number): void {
    this._sims.delete(objId);
    this._balls.delete(objId);
  }

  getActiveCount(): number {
    return this._sims.size + this._balls.size;
  }

  getWaitingFallingObj(): IFallingObj | undefined {
    for (const sim of this._sims.values()) {
      if (sim.waiting()) return sim;
    }
    for (const ball of this._balls.values()) {
      if (ball.waiting()) return ball;
    }
    return undefined;
  }

  getLowestFallingObj(): IFallingObj | null {
    let closest: IFallingObj | null = null;
    let closestY = Infinity;
    for (const sim of this._sims.values()) {
      if (sim.waiting()) continue;
      const y = sim.getLowestY();
      if (y < closestY) { closestY = y; closest = sim; }
    }
    for (const ball of this._balls.values()) {
      if (ball.waiting()) continue;
      const y = ball.getLowestY();
      if (y < closestY) { closestY = y; closest = ball; }
    }
    return closest;
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  @subscribe(Events.InitFallingObj)
  onInitFallingObj(p: Events.InitFallingObjPayload): void {
    const sim = new LogSim(p.objId, p.cx, p.roundIndex, p.config);
    this.registerLog(sim);
  }

  @subscribe(Events.FallingObjActivate)
  onActivate(p: Events.FallingObjActivatePayload): void {
    this._sims.get(p.objId)?.activate();
  }

  @subscribe(Events.FallingObjFreeze)
  onFreeze(p: Events.FallingObjFreezePayload): void {
    const sim = this._sims.get(p.objId);
    if (!sim || sim.isFrozen()) return;

    const lowestY = sim.getLowestY();
    sim.freeze();
    this.unregister(p.objId);

    const { pts, grade } = calcScore(getPrecision(lowestY));
    EventService.sendLocally(Events.FallingObjFrozen, {
      objId: p.objId, pts, grade, lowestY,
    });
  }

  @subscribe(Events.PhaseChanged)
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    this._paused = (p.phase !== GamePhase.Falling);
  }

  @subscribe(Events.Restart)
  onRestart(_p: Events.RestartPayload): void {
    this._sims.clear();
    this._balls.clear();
    this._paused = false;
  }

  // ── Update loop ───────────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent)
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const dt = payload.deltaTime;
    const states: FallingObjRenderState[] = [];

    if (!this._paused) {
      for (const sim of this._sims.values()) {
        sim.tick(dt);
        if (sim.getLowestY() <= FLOOR_Y) {
          sim.freeze();
          // Keep faulted log in _sims so it stays visible during game over feedback
          this._faultedObjId = sim.objId;
          EventService.sendLocally(Events.FallingObjHitFloor, { objId: sim.objId });
        }
      }
    }

    for (const sim of this._sims.values()) {
      states.push(sim.toRenderState());
    }

    EventService.sendLocally(Events.RenderFallingObjs, { states });
  }
}
