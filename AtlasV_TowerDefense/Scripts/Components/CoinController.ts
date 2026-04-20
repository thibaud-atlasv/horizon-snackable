/**
 * CoinController — Physics-simulated coin loot effect.
 *
 * Each coin gets a random initial velocity burst (radial XZ + upward Y).
 * Gravity pulls it down each frame. On ground contact: bounce with restitution,
 * friction on XZ, angular deceleration. Coin tilts toward flat as it slows.
 * Once nearly stopped, a brief wait then collect (absorbed toward HUD).
 */
import { Component, TransformComponent, Vec3, Quaternion, EventService } from 'meta/worlds';
import { component, subscribe } from 'meta/worlds';
import { OnEntityStartEvent, OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';
import { Events } from '../Types';
import { CoinService, COIN_PARK_POSITION } from '../Services/CoinService';

type CoinPhase = 'idle' | 'delay' | 'physics' | 'wait' | 'collect';

const GRAVITY           = -9.8;
const LAUNCH_VY_MIN     = 3.5;
const LAUNCH_VY_MAX     = 6.0;
const LAUNCH_VXZ_MIN    = 0.6;
const LAUNCH_VXZ_MAX    = 1.8;
const RESTITUTION_MIN   = 0.25; // how bouncy (0=dead, 1=elastic)
const RESTITUTION_MAX   = 0.55;
const FRICTION          = 0.55; // XZ velocity multiplier on each bounce
const SPIN_INITIAL_MIN  = 10;
const SPIN_INITIAL_MAX  = 22;
const SPIN_FRICTION     = 0.55; // spin multiplier on each bounce
const STOP_THRESHOLD    = 0.08; // speed below which coin is considered stopped
const DELAY_MAX         = 0.12;
const WAIT_DURATION     = 0.20;
const COLLECT_DURATION  = 0.75;
const COLLECT_TARGET = new Vec3(5.5, 3, 3);
const FLOOR_Y           = 0.05;

@component()
export class CoinController extends Component {
  private _transform!: TransformComponent;

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
    const angle = Math.random() * Math.PI * 2;
    const speed = LAUNCH_VXZ_MIN + Math.random() * (LAUNCH_VXZ_MAX - LAUNCH_VXZ_MIN);
    this._px = p.worldX;
    this._py = FLOOR_Y;
    this._pz = p.worldZ;
    this._vx = Math.cos(angle) * speed;
    this._vy = LAUNCH_VY_MIN + Math.random() * (LAUNCH_VY_MAX - LAUNCH_VY_MIN);
    this._vz = Math.sin(angle) * speed;
    this._restitution = RESTITUTION_MIN + Math.random() * (RESTITUTION_MAX - RESTITUTION_MIN);
    this._spinSpeed = SPIN_INITIAL_MIN + Math.random() * (SPIN_INITIAL_MAX - SPIN_INITIAL_MIN);
    this._spinDir = Math.random() < 0.5 ? 1 : -1;
    this._spinX = Math.random() * Math.PI * 2;
    this._tiltX = 0; // starts upright
    this._restRotY = Math.random() * 360;
    this._collectAmount = p.amount;
    this._delay = Math.random() * DELAY_MAX;
    this._phase = 'delay';
    this._timer = 0;
    this._transform.worldPosition = COIN_PARK_POSITION;
    this._transform.localScale = new Vec3(1, 1, 1);
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (this._phase === 'idle') return;

    this._timer += p.deltaTime;

    if (this._phase === 'delay') {
      if (this._timer >= this._delay) {
        this._phase = 'physics';
        this._timer = 0;
        this._transform.worldPosition = new Vec3(this._px, this._py, this._pz);
      }
      return;
    }

    if (this._phase === 'physics')      this._updatePhysics(p.deltaTime);
    else if (this._phase === 'wait')    this._updateWait();
    else if (this._phase === 'collect') this._updateCollect();
  }

  private _updatePhysics(dt: number): void {
    // integrate gravity
    this._vy += GRAVITY * dt;
    this._px += this._vx * dt;
    this._py += this._vy * dt;
    this._pz += this._vz * dt;

    // ground collision
    if (this._py <= FLOOR_Y) {
      this._py = FLOOR_Y;
      this._vy = -this._vy * this._restitution;
      this._vx *= FRICTION;
      this._vz *= FRICTION;
      this._spinSpeed *= SPIN_FRICTION;

      // squash on impact — proportional to impact velocity
      const impact = Math.min(Math.abs(this._vy) / 5, 1);
      const squash  = 1 - 0.35 * impact;
      const stretch = 1 + 0.30 * impact;
      this._transform.localScale = new Vec3(stretch, squash, stretch);
    } else {
      // recover scale toward 1 in air
      const s = this._transform.localScale;
      const sx = s.x + (1 - s.x) * Math.min(dt * 12, 1);
      const sy = s.y + (1 - s.y) * Math.min(dt * 12, 1);
      this._transform.localScale = new Vec3(sx, sy, sx);
    }

    this._transform.worldPosition = new Vec3(this._px, this._py, this._pz);

    // spin on X (rolling)
    this._spinX += dt * this._spinSpeed * this._spinDir;

    // tilt toward flat (90°) as horizontal speed decreases
    const hSpeed = Math.sqrt(this._vx * this._vx + this._vz * this._vz);
    const flatness = 1 - Math.min(hSpeed / LAUNCH_VXZ_MAX, 1);
    this._tiltX = flatness * 85; // approach 85° (nearly flat, not perfectly)

    this._transform.localRotation = Quaternion.fromEuler(
      new Vec3(this._tiltX + this._spinX * (180 / Math.PI), this._restRotY, 0)
    );

    // stop condition: near floor and very slow
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
    const scale = 1 - ease;
    this._transform.worldPosition = new Vec3(x, y, z);
    this._transform.localScale = new Vec3(scale, scale, scale);
    // un-tilt as it rises
    this._transform.localRotation = Quaternion.fromEuler(new Vec3(85 * (1 - t), this._restRotY, 0));

    if (t >= 1) {
      this._phase = 'idle';
      this._transform.worldPosition = COIN_PARK_POSITION;
      const collected = new Events.CoinCollectedPayload();
      collected.amount = this._collectAmount;
      EventService.sendLocally(Events.CoinCollected, collected);
      CoinService.get().release(this.entity);
    }
  }
}
