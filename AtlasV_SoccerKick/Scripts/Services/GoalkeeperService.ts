import { Service, service } from 'meta/worlds';
import {
  GK_START_Z, GK_SPEED, GK_IDLE_SPEED, GK_REACTION_MS,
  GK_DIVE_CHANCE, GK_DIVE_SPEED, GK_DIVE_LATERAL, GK_DIVE_HEIGHT,
  GOAL_HALF_W,
  GK_HALF_W, GK_STAND_H,
  GK_DIVE_HALF_W_BASE, GK_DIVE_HALF_W_GROW,
  GK_DIVE_H_BASE, GK_DIVE_H_GROW,
} from '../Constants';

@service()
export class GoalkeeperService extends Service {

  // ── State ────────────────────────────────────────────────────────────────────

  private _x        = 0;
  private _targetX  = 0;
  private _y        = 0;       // vertical offset (dive arc)
  private _rotZ     = 0;       // body lean / dive roll

  private _reacting = false;
  private _diving   = false;
  private _diveDir  = 0;       // −1 left, +1 right
  private _diveT    = 0;       // 0..1 animation progress

  private _idleT    = 0;       // accumulator for idle sway

  private _reactionTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Read access ──────────────────────────────────────────────────────────────

  get posX(): number   { return this._x; }
  get posY(): number   { return this._y; }
  get rotZ(): number   { return this._rotZ; }
  get diving(): boolean { return this._diving; }
  get diveT(): number  { return this._diveT; }
  get diveDir(): number { return this._diveDir; }
  get idleT(): number  { return this._idleT; }
  get reacting(): boolean { return this._reacting; }
  get startZ(): number { return GK_START_Z; }

  // ── React to a kick ──────────────────────────────────────────────────────────

  /** Called when the ball is kicked. Ball state passed in to avoid circular dep. */
  onBallKicked(ballX: number, ballZ: number, ballVx: number, ballVz: number): void {
    this._reactionTimer = setTimeout(() => {
      this._reacting = true;

      if (ballVz === 0) return;

      // Predict where the ball will cross the goal line
      const tToGoal = Math.abs(ballZ / ballVz);
      const landX   = ballX + ballVx * tToGoal;
      const clamp   = GOAL_HALF_W - 0.4;
      this._targetX = Math.max(-clamp, Math.min(clamp, landX));

      // Dive decision
      const cornerDist = Math.min(
        Math.abs(landX - GOAL_HALF_W),
        Math.abs(landX + GOAL_HALF_W),
      );
      const isFast   = Math.abs(ballVz) > 0.28;
      const isCorner = cornerDist < GOAL_HALF_W * 0.5;

      if ((isFast || isCorner) && Math.random() < GK_DIVE_CHANCE) {
        this._diving  = true;
        this._diveDir = landX > 0 ? 1 : -1;
      }
    }, GK_REACTION_MS);
  }

  // ── Collision check (called by GameManager) ──────────────────────────────────

  /** Returns true if the ball at (bx, by) is within the GK's current hitbox. */
  checkSave(bx: number, by: number): boolean {
    let halfW: number;
    let maxH: number;

    if (this._diving) {
      halfW = GK_DIVE_HALF_W_BASE + this._diveT * GK_DIVE_HALF_W_GROW;
      maxH  = (GK_DIVE_H_BASE + this._diveT * GK_DIVE_H_GROW) * 2;
    } else {
      halfW = GK_HALF_W;
      maxH  = GK_STAND_H;
    }

    return (
      bx > this._x - halfW && bx < this._x + halfW &&
      by > 0.05 && by < maxH
    );
  }

  // ── Per-frame update ─────────────────────────────────────────────────────────

  tick(dt: number): void {
    // The prototype assumed fixed ~60 fps steps.
    // Scale by dt * 60 so the same constants produce identical results.
    const step = dt * 60;
    this._idleT += step * (1 / 60); // keep _idleT in "seconds" for sin() frequency

    if (this._diving) {
      this._tickDive(step);
    } else if (this._reacting) {
      this._tickReact(step);
    } else {
      this._tickIdle(step);
    }
  }

  private _tickDive(step: number): void {
    this._diveT = Math.min(this._diveT + step * (1 / 60) * GK_DIVE_SPEED, 1);
    const t = this._diveT;
    this._x    = this._x + this._diveDir * t * GK_DIVE_LATERAL * step * (1 / 60) * 2;
    this._y    = Math.sin(t * Math.PI) * GK_DIVE_HEIGHT;
    this._rotZ = -this._diveDir * t * Math.PI * 0.52;
  }

  private _tickReact(step: number): void {
    const diff = this._targetX - this._x;
    const move = Math.min(Math.abs(diff), GK_SPEED * step);
    this._x += Math.sign(diff) * move;
    this._y = 0;
    this._rotZ = -Math.sign(diff) * 0.1;
  }

  private _tickIdle(step: number): void {
    const sway = Math.sin(this._idleT * 1.1) * (GOAL_HALF_W - 0.8);
    const diff = sway - this._x;
    const move = Math.min(Math.abs(diff), GK_IDLE_SPEED * step);
    this._x += Math.sign(diff) * move;
    this._y = 0;
    this._rotZ = Math.sign(diff) * 0.05;
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  reset(): void {
    if (this._reactionTimer !== null) {
      clearTimeout(this._reactionTimer);
      this._reactionTimer = null;
    }
    this._x        = 0;
    this._targetX  = 0;
    this._y        = 0;
    this._rotZ     = 0;
    this._reacting = false;
    this._diving   = false;
    this._diveDir  = 0;
    this._diveT    = 0;
  }
}
