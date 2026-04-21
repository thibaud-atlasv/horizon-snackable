import { Component, TransformComponent, Vec3, Quaternion, EventService } from 'meta/worlds';
import { component, subscribe } from 'meta/worlds';
import { OnEntityStartEvent, OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';
import { Events } from '../Types';
import { CoinService, COIN_PARK_POSITION } from '../Services/CoinService';

// Set to true to use the elevate mode (coins spin in place then rise to HUD).
// Set to false for the original physics bounce mode.
const USE_ELEVATE_MODE = true;

type CoinPhase = 'idle' | 'delay' | 'physics' | 'wait' | 'collect' | 'spin' | 'elevate';

// ── Physics mode ─────────────────────────────────────────────────────────────
const GRAVITY           = -9.8;
const LAUNCH_VY_MIN     = 3.5;
const LAUNCH_VY_MAX     = 6.0;
const LAUNCH_VXZ_MIN    = 0.6;
const LAUNCH_VXZ_MAX    = 1.8;
const RESTITUTION_MIN   = 0.25;
const RESTITUTION_MAX   = 0.55;
const FRICTION          = 0.55;
const SPIN_INITIAL_MIN  = 10;
const SPIN_INITIAL_MAX  = 22;
const SPIN_FRICTION     = 0.55;
const STOP_THRESHOLD    = 0.08;
const DELAY_MAX         = 0.12;
const WAIT_DURATION     = 0.20;
const COLLECT_DURATION  = 0.75;
const FLOOR_Y           = 0.4;

// ── Elevate mode ──────────────────────────────────────────────────────────────
const ELEVATE_SPIN_SPEED    = 180;  // degrees/s spin around coin's local up axis
const ELEVATE_SPIN_DURATION = 0.6;  // seconds before rising
const ELEVATE_RISE_DURATION = 0.55; // seconds for rise + shrink phase
const ELEVATE_HOLD_RATIO    = 0.5;  // fraction of rise duration at full scale before shrinking
const ELEVATE_RISE_HEIGHT   = 3.5;  // world units to rise in Y during collect
const ELEVATE_RISE_X        = 2.0;  // world units to move in X during collect (X+ = top of screen)
const ELEVATE_DELAY_MAX     = 0.35; // max stagger delay between coins (seconds)
const COIN_TILT_X           = -45;   // permanent X tilt to fake isometric look

// ── Shared ────────────────────────────────────────────────────────────────────
const COLLECT_TARGET = new Vec3(5.5, 3, 3);

@component()
export class CoinController extends Component {
  private _transform!: TransformComponent;

  private static _globalSpinTime: number = 0;

  private _phase: CoinPhase = 'idle';
  private _timer: number = 0;
  private _delay: number = 0;

  // physics state
  private _px: number = 0;
  private _py: number = 0;
  private _pz: number = 0;
  private _vx: number = 0;
  private _vy: number = 0;
  private _vz: number = 0;
  private _restitution: number = 0.4;

  // spin — X axis (rolling), decelerates with friction
  private _spinX: number = 0;
  private _spinSpeed: number = 0; // rad/s
  private _spinDir: number = 1;

  // tilt toward flat when at rest
  private _tiltX: number = 0; // current tilt degrees


  // resting Y rotation (random, fixed per coin)
  private _restRotY: number = 0;

  // collect start position
  private _collectX: number = 0;
  private _collectZ: number = 0;
  private _collectAmount: number = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
  }

  @subscribe(Events.ActivateCoin)
  onActivate(p: Events.ActivateCoinPayload): void {
    this._px = p.worldX;
    this._py = FLOOR_Y;
    this._pz = p.worldZ;
    this._collectAmount = p.amount;
    this._restRotY = Math.random() * 360;
    this._collectX = this._px;
    this._collectZ = this._pz;
    this._transform.worldPosition = COIN_PARK_POSITION;
    this._transform.localScale = new Vec3(1, 1, 1);

    if (USE_ELEVATE_MODE) {
      this._delay = Math.random() * ELEVATE_DELAY_MAX;
      this._phase = 'delay';
      this._timer = 0;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const speed = LAUNCH_VXZ_MIN + Math.random() * (LAUNCH_VXZ_MAX - LAUNCH_VXZ_MIN);
      this._vx = Math.cos(angle) * speed;
      this._vy = LAUNCH_VY_MIN + Math.random() * (LAUNCH_VY_MAX - LAUNCH_VY_MIN);
      this._vz = Math.sin(angle) * speed;
      this._restitution = RESTITUTION_MIN + Math.random() * (RESTITUTION_MAX - RESTITUTION_MIN);
      this._spinSpeed = SPIN_INITIAL_MIN + Math.random() * (SPIN_INITIAL_MAX - SPIN_INITIAL_MIN);
      this._spinDir = Math.random() < 0.5 ? 1 : -1;
      this._spinX = Math.random() * Math.PI * 2;
      this._tiltX = 0;
      this._delay = Math.random() * DELAY_MAX;
      this._phase = 'delay';
      this._timer = 0;
    }
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (this._phase === 'idle') return;

    this._timer += p.deltaTime;

    if (this._phase === 'delay') {
      if (this._timer >= this._delay) {
        this._timer = 0;
        this._transform.worldPosition = new Vec3(this._px, this._py, this._pz);
        this._phase = USE_ELEVATE_MODE ? 'spin' : 'physics';
      }
      return;
    }

    if (USE_ELEVATE_MODE) {
      if (this._phase === 'spin')    this._updateSpin(p.deltaTime);
      else if (this._phase === 'elevate') this._updateElevate(p.deltaTime);
    } else {
      if (this._phase === 'physics')      this._updatePhysics(p.deltaTime);
      else if (this._phase === 'wait')    this._updateWait();
      else if (this._phase === 'collect') this._updateCollect();
    }
  }

  // ── Elevate mode ──────────────────────────────────────────────────────────

  private _coinRotation(spinY: number): Quaternion {
    // spin around coin's local up axis: apply spin first, then tilt on top
    return Quaternion.fromEuler(new Vec3(0, spinY, COIN_TILT_X));
    
    /*Quaternion.mul(
      Quaternion.fromEuler(new Vec3(COIN_TILT_X, 0, 0)),
      Quaternion.fromEuler(new Vec3(0, spinY, 0)),
    );*/
  }

  private _updateSpin(dt: number): void {
    CoinController._globalSpinTime += dt;
    const syncY = (CoinController._globalSpinTime * ELEVATE_SPIN_SPEED) % 360;
    this._transform.localRotation = this._coinRotation(syncY);

    if (this._timer >= ELEVATE_SPIN_DURATION) {
      this._restRotY = syncY;
      this._phase = 'elevate';
      this._timer = 0;
    }
  }

  private _updateElevate(dt: number): void {
    this._restRotY += ELEVATE_SPIN_SPEED * dt;
    const t = Math.min(this._timer / ELEVATE_RISE_DURATION, 1);
    const ease = t * t * (3 - 2 * t); // smoothstep
    const x = this._collectX + ease * ELEVATE_RISE_X;
    const y = FLOOR_Y + ease * ELEVATE_RISE_HEIGHT;
    // hold full scale for first HOLD_RATIO, then shrink to 0
    const shrinkT = Math.max(0, (t - ELEVATE_HOLD_RATIO) / (1 - ELEVATE_HOLD_RATIO));
    const scale = 1 - shrinkT;
    this._transform.worldPosition = new Vec3(x, y, this._collectZ);
    this._transform.localScale = new Vec3(scale, scale, scale);
    this._transform.localRotation = this._coinRotation(this._restRotY);

    if (t >= 1) this._finishCollect();
  }

  // ── Physics mode ──────────────────────────────────────────────────────────

  private _updatePhysics(dt: number): void {
    this._vy += GRAVITY * dt;
    this._px += this._vx * dt;
    this._py += this._vy * dt;
    this._pz += this._vz * dt;

    if (this._py <= FLOOR_Y) {
      this._py = FLOOR_Y;
      this._vy = -this._vy * this._restitution;
      this._vx *= FRICTION;
      this._vz *= FRICTION;
      this._spinSpeed *= SPIN_FRICTION;

      // squash on impact proportional to impact velocity
      const impact = Math.min(Math.abs(this._vy) / 5, 1);
      this._transform.localScale = new Vec3(1 + 0.30 * impact, 1 - 0.35 * impact, 1 + 0.30 * impact);
    } else {
      const s = this._transform.localScale;
      const sx = s.x + (1 - s.x) * Math.min(dt * 12, 1);
      const sy = s.y + (1 - s.y) * Math.min(dt * 12, 1);
      this._transform.localScale = new Vec3(sx, sy, sx);
    }

    this._transform.worldPosition = new Vec3(this._px, this._py, this._pz);

    this._spinX += dt * this._spinSpeed * this._spinDir;
    const hSpeed = Math.sqrt(this._vx * this._vx + this._vz * this._vz);
    this._tiltX = (1 - Math.min(hSpeed / LAUNCH_VXZ_MAX, 1)) * 85;
    this._transform.localRotation = Quaternion.fromEuler(
      new Vec3(this._tiltX + this._spinX * (180 / Math.PI), this._restRotY, 0),
    );

    const totalSpeed = Math.sqrt(this._vx * this._vx + this._vy * this._vy + this._vz * this._vz);
    if (this._py <= FLOOR_Y && totalSpeed < STOP_THRESHOLD) {
      this._vx = 0; this._vy = 0; this._vz = 0;
      this._spinSpeed = 0;
      this._transform.localScale = new Vec3(1, 1, 1);
      this._transform.localRotation = Quaternion.fromEuler(new Vec3(85, this._restRotY, 0));
      this._collectX = this._px;
      this._collectZ = this._pz;
      this._phase = 'wait';
      this._timer = 0;
    }
  }

  private _updateWait(): void {
    if (this._timer >= WAIT_DURATION) {
      this._phase = 'collect';
      this._timer = 0;
    }
  }

  private _updateCollect(): void {
    const t = Math.min(this._timer / COLLECT_DURATION, 1);
    const ease = t * t * t;
    const x = this._collectX + ease * (COLLECT_TARGET.x - this._collectX);
    const y = FLOOR_Y + ease * (COLLECT_TARGET.y - FLOOR_Y);
    const z = this._collectZ + ease * (COLLECT_TARGET.z - this._collectZ);
    this._transform.worldPosition = new Vec3(x, y, z);
    this._transform.localScale = new Vec3(1 - ease, 1 - ease, 1 - ease);
    this._transform.localRotation = Quaternion.fromEuler(new Vec3(85 * (1 - t), this._restRotY, 0));

    if (t >= 1) this._finishCollect();
  }

  // ── Shared ────────────────────────────────────────────────────────────────

  private _finishCollect(): void {
    this._phase = 'idle';
    this._transform.worldPosition = COIN_PARK_POSITION;
    const collected = new Events.CoinCollectedPayload();
    collected.amount = this._collectAmount;
    EventService.sendLocally(Events.CoinCollected, collected);
    CoinService.get().release(this.entity);
  }
}
