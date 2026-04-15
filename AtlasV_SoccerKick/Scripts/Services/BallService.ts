import { Service, service, Vec3 } from 'meta/worlds';
import { GamePhase, ShotOutcome } from '../Types';
import {
  BALL_RADIUS, BALL_START_X, BALL_START_Y, BALL_START_Z,
  BALL_SPEED_BASE, BALL_SPEED_POWER, BALL_SIDE_FACTOR,
  BALL_ARC_BASE, BALL_ARC_POWER, BALL_GRAVITY,
  BALL_SPIN_FORWARD, BALL_SPIN_SIDE,
  BOUNCE_VY_FAR, BOUNCE_DAMP_FAR, BOUNCE_VY_NEAR, BOUNCE_DAMP_NEAR,
  BALL_STOP_SPEED,
  RESULT_BOUNCE_VY, RESULT_BOUNCE_XZ, NET_BOUNCE_DAMP,
  SAVE_BOUNCE_Z, SAVE_BOUNCE_Z_MIN, SAVE_BOUNCE_X, SAVE_BOUNCE_VY,
  POST_BOUNCE_X, POST_BOUNCE_Z,
  GOAL_HALF_W, GOAL_HEIGHT, GOAL_DEPTH, GOAL_POST_RADIUS, POST_HIT_RADIUS,
} from '../Constants';

@service()
export class BallService extends Service {

  // ── Ball state (world-space) ─────────────────────────────────────────────────

  private _px = BALL_START_X;
  private _py = BALL_START_Y;
  private _pz = BALL_START_Z;

  private _vx = 0;
  private _vy = 0;
  private _vz = 0;

  private _spinX = 0;
  private _spinY = 0;

  private _active = false;

  // ── Public read access ───────────────────────────────────────────────────────

  get posX(): number { return this._px; }
  get posY(): number { return this._py; }
  get posZ(): number { return this._pz; }
  get velX(): number { return this._vx; }
  get velZ(): number { return this._vz; }
  get spinX(): number { return this._spinX; }
  get spinY(): number { return this._spinY; }
  get active(): boolean { return this._active; }

  position(): Vec3 { return new Vec3(this._px, this._py, this._pz); }

  /** True when the ball is in the zone where a GK save is possible. */
  get inGKZone(): boolean {
    const inX = this._px > -(GOAL_HALF_W - GOAL_POST_RADIUS) &&
                this._px <  (GOAL_HALF_W - GOAL_POST_RADIUS);
    const inY = this._py > 0.1 && this._py < GOAL_HEIGHT - GOAL_POST_RADIUS;
    return this._pz < 1.0 && this._pz > -0.5 && inX && inY;
  }

  // ── Kick ─────────────────────────────────────────────────────────────────────

  kick(power: number, sideRatio: number): void {
    const speed = BALL_SPEED_BASE + power * BALL_SPEED_POWER;

    this._vx = sideRatio * speed * BALL_SIDE_FACTOR;
    this._vy = BALL_ARC_BASE + power * BALL_ARC_POWER;
    this._vz = -(speed * 1.0);

    this._spinX = speed * BALL_SPIN_FORWARD;
    this._spinY = sideRatio * -BALL_SPIN_SIDE;

    this._active = true;
  }

  // ── Physics tick ─────────────────────────────────────────────────────────────

  /**
   * Advance the ball by one frame.
   * Returns a ShotOutcome when the ball reaches a terminal state (goal/post/miss),
   * or null while still in flight.
   *
   * NOTE: Save detection is NOT done here — GameManager checks GK collision
   * via GoalkeeperService to avoid a circular dependency.
   */
  /** @param dt deltaTime in seconds (MHS convention). */
  tick(phase: GamePhase, dt: number): ShotOutcome | null {
    if (!this._active) return null;

    // The prototype assumed a fixed ~60 fps step.
    // Scale by dt * 60 so the same velocity constants produce identical results.
    const step = dt * 60;

    // Integrate
    this._vy -= BALL_GRAVITY * step;
    this._px += this._vx * step;
    this._py += this._vy * step;
    this._pz += this._vz * step;

    if (phase === GamePhase.Flying) {
      return this._tickFlying();
    }

    if (phase === GamePhase.Result) {
      this._tickResult();
    }

    return null;
  }

  // ── Flying-phase logic ───────────────────────────────────────────────────────

  private _tickFlying(): ShotOutcome | null {
    // Sweep-based goal plane check: interpolate the exact Z=0 crossing to avoid
    // tunneling when the ball moves faster than one frame's worth of depth.
    if (this._pz <= 0.1) {
      const outcome = this._checkGoalGeometry();
      if (outcome !== null) return outcome;

      // Passed behind goal without hitting anything
      if (this._pz < -(GOAL_DEPTH + 0.3)) return ShotOutcome.Miss;
    }

    // Ground bounce far from goal
    if (this._py <= BALL_RADIUS && this._vy < 0 && this._pz > 2.0) {
      this._py = BALL_RADIUS;
      this._vy = Math.abs(this._vy) * BOUNCE_VY_FAR;
      this._vx *= BOUNCE_DAMP_FAR;
      this._vz *= BOUNCE_DAMP_FAR;
      if (Math.abs(this._vz) < 0.04) return ShotOutcome.Miss;
    }

    // Ground bounce near goal — only while still in front of the goal line
    if (this._py <= BALL_RADIUS && this._vy < 0 && this._pz <= 2.0 && this._pz > 0) {
      this._py = BALL_RADIUS;
      this._vy = Math.abs(this._vy) * BOUNCE_VY_NEAR;
      this._vx *= BOUNCE_DAMP_NEAR;
      this._vz *= BOUNCE_DAMP_NEAR;
      if (Math.abs(this._vz) < 0.02 && Math.abs(this._vy) < 0.02) return ShotOutcome.Miss;
    }

    // Ground clamp inside goal volume — prevents tunneling through the floor
    // on high-arc shots that fall nearly vertically into the goal mouth
    if (this._py <= BALL_RADIUS && this._vy < 0 && this._pz <= 0 && this._pz > -GOAL_DEPTH) {
      this._py = BALL_RADIUS;
      this._vy = Math.abs(this._vy) * BOUNCE_VY_NEAR;
      this._vx *= BOUNCE_DAMP_NEAR;
      this._vz *= BOUNCE_DAMP_NEAR;
    }

    // Ball nearly stopped
    const spd = Math.abs(this._vx) + Math.abs(this._vy) + Math.abs(this._vz);
    if (spd < BALL_STOP_SPEED && this._pz > 0.1) return ShotOutcome.Miss;

    // Way off to side
    if (Math.abs(this._px) > 8) return ShotOutcome.Miss;

    return null;
  }

  // ── Goal geometry only (no GK) ──────────────────────────────────────────────

  private _checkGoalGeometry(): ShotOutcome | null {
    const inZ = this._pz < 0.1 && this._pz > -(GOAL_DEPTH + 0.1);
    if (!inZ) return null;

    // Interpolate ball position to the exact goal-line plane (z=0) to avoid
    // tunneling: evaluate geometry at the swept position, not the current one.
    const t   = this._vz !== 0 ? -this._pz / this._vz : 0; // frames to reach z=0
    const ex  = this._px - this._vx * t; // extrapolated X at z=0
    const ey  = this._py - this._vy * t; // extrapolated Y at z=0

    const inX = ex > -(GOAL_HALF_W - GOAL_POST_RADIUS) &&
                ex <  (GOAL_HALF_W - GOAL_POST_RADIUS);
    const inY = ey > BALL_RADIUS && ey < GOAL_HEIGHT - GOAL_POST_RADIUS;

    if (inX && inY) {
      // Ball enters the net — dampen velocity
      this._vz *= 0.25;
      this._vx *= 0.4;
      this._vy = Math.abs(this._vy) * 0.3;
      return ShotOutcome.Goal;
    }

    // Post / crossbar: use POST_HIT_RADIUS (post radius + ball radius) for a
    // physically correct contact distance instead of a flat threshold.
    const hitLeftPost  = Math.abs(ex + GOAL_HALF_W) < POST_HIT_RADIUS && inY;
    const hitRightPost = Math.abs(ex - GOAL_HALF_W) < POST_HIT_RADIUS && inY;
    const hitCrossbar  = inX && Math.abs(ey - GOAL_HEIGHT) < POST_HIT_RADIUS;

    if (hitLeftPost || hitRightPost || hitCrossbar) {
      this._vx *= POST_BOUNCE_X;
      this._vz *= POST_BOUNCE_Z;
      return ShotOutcome.PostHit;
    }

    return null;
  }

  // ── Save deflection (called by GameManager after GK collision) ───────────────

  deflectSave(): void {
    this._pz = Math.max(this._pz, 0.9);
    this._vz = Math.abs(this._vz) * SAVE_BOUNCE_Z + SAVE_BOUNCE_Z_MIN;
    this._vx *= SAVE_BOUNCE_X;
    this._vy = SAVE_BOUNCE_VY;
  }

  // ── Result-phase bounce ──────────────────────────────────────────────────────

  private _tickResult(): void {
    const inGoal = this._pz < 0 && this._pz > -GOAL_DEPTH &&
                   this._py < GOAL_HEIGHT &&
                   Math.abs(this._px) < GOAL_HALF_W;

    // Ground clamp outside goal (save/post/miss bounce on the pitch)
    if (!inGoal) {
      if (this._py <= BALL_RADIUS && this._vy < 0) {
        this._py = BALL_RADIUS;
        this._vy = Math.abs(this._vy) * RESULT_BOUNCE_VY;
        this._vx *= RESULT_BOUNCE_XZ;
        this._vz *= RESULT_BOUNCE_XZ;
      }
      return;
    }

    // Ground bounce inside the net
    if (this._py <= BALL_RADIUS) {
      this._py = BALL_RADIUS;
      this._vy = Math.abs(this._vy) * RESULT_BOUNCE_VY;
      this._vx *= RESULT_BOUNCE_XZ;
      this._vz *= RESULT_BOUNCE_XZ;
    }

    // Back net
    if (this._pz < -(GOAL_DEPTH - 0.1)) {
      this._vz = Math.abs(this._vz) * NET_BOUNCE_DAMP;
    }

    // Side nets
    const netX = GOAL_HALF_W - BALL_RADIUS;
    if (this._px > netX) {
      this._px = netX;
      this._vx = -Math.abs(this._vx) * NET_BOUNCE_DAMP;
    } else if (this._px < -netX) {
      this._px = -netX;
      this._vx = Math.abs(this._vx) * NET_BOUNCE_DAMP;
    }
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  reset(): void {
    this._px = BALL_START_X;
    this._py = BALL_START_Y;
    this._pz = BALL_START_Z;
    this._vx = 0;
    this._vy = 0;
    this._vz = 0;
    this._spinX = 0;
    this._spinY = 0;
    this._active = false;
  }
}
