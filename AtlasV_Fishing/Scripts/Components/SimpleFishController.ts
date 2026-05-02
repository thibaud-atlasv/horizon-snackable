import {
  Component,
  EventService,
  NetworkingService,
  OnEntityCreateEvent,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  Quaternion,
  TransformComponent,
  Vec3,
  WorldService,
  component,
  subscribe,
} from 'meta/worlds';

import {
  FISH_LEFT, FISH_RIGHT,
  FISH_PAUSE_DUR_MIN, FISH_PAUSE_DUR_MAX, FISH_BOB_AMP, FISH_BOB_FREQ, FISH_MIN_MOVE_DIST,
  BUBBLE_INTERVAL_MIN, BUBBLE_INTERVAL_MAX,
  BUBBLE_SPAWN_OFFSET_X, BUBBLE_SPAWN_OFFSET_Y,
} from '../Constants';
import { Events, type IFishInstance } from '../Types';
import { FishRegistry } from '../Services/FishRegistry';
import { BubblePool } from '../Services/BubblePool';
import { VFXService } from '../Services/VFXService';

let _nextFishId = 1;

// =============================================================================
//  SimpleFishController — pool-aware fish entity.
//
//  Never destroyed after initial spawn. When recycled by FishPoolService,
//  recycle() resets state and teleports the entity to a new position.
//
//  States:
//    free   — swimming autonomously, eligible for collision and recycling
//    hooked — follows hook position, set by HookController via setPosition()
//    flying — launched upward during reward anim (Launching phase)
// =============================================================================

@component()
export class SimpleFishController extends Component implements IFishInstance {

  // ── IFishInstance ────────────────────────────────────────────────────────────
  get fishId():   number  { return this._fishId; }
  get defId():    number  { return this._defId; }
  get worldX():   number  { return this._currentX; }
  get worldY():   number  { return this._currentY; }
  get size():     number  { return this._size; }
  get isHooked(): boolean  { return this._hooked; }
  set isHooked(v: boolean) { this._hooked = v; }
  get isFlying(): boolean  { return this._flying; }
  stopFlying(): void       { this._flying = false; }

  // ── State ────────────────────────────────────────────────────────────────────
  private _fishId    = 0;
  private _defId     = 0;
  private _size      = 1.0;
  private _hooked    = false;
  private _flying    = false;  // during Launching phase

  private _baseY     = 0;
  private _currentX  = 0;
  private _currentY  = 0;
  private _targetX   = 0;
  private _moveSpeed = 1.0;

  private _facingLeft = false;
  private _pausing    = false;
  private _pauseDur   = 0;

  // Flying physics
  private _flyVX = 0;
  private _flyVY = 0;
  private _flyGravity = 0;

  private _bubbleTimer = 100;
  private _tc!: TransformComponent;

  // ── Init ─────────────────────────────────────────────────────────────────────

  @subscribe(OnEntityCreateEvent)
  created(): void {
    this._tc = this.entity.getComponent(TransformComponent)!;
  }

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
  }

  @subscribe(Events.InitFish)
  onInit(p: Events.InitFishPayload): void {
    this._fishId    = _nextFishId++;
    this._defId     = p.defId;
    this._size      = p.size;
    this._hooked    = false;
    this._flying    = false;
    this._currentX  = p.spawnX;
    this._baseY     = p.baseY;
    this._currentY  = p.baseY;
    this._targetX   = this._randomTargetX(this._currentX);
    this._moveSpeed = p.speedMin + Math.random() * (p.speedMax - p.speedMin);
    this._facingLeft = this._targetX < this._currentX;
    this._flipScale();
    this._tc.localScale    = new Vec3(this._size, this._size, this._size);
    this._tc.worldPosition = new Vec3(this._currentX, this._currentY, 0);
    this._bubbleTimer = Math.random() * BUBBLE_INTERVAL_MAX * 2;
    FishRegistry.get().addFish(this);
    EventService.sendLocally(Events.FishReady, { fishId: this._fishId });
  }

  // ── IFishInstance impl ────────────────────────────────────────────────────────

  setPosition(x: number, y: number): void {
    this._currentX = x;
    this._currentY = y;
    this._tc.worldPosition = new Vec3(x, y, 0);
  }

  /** Teleport to a visible swim slot — called by FishPoolService when activating from bench. */
  activate(x: number, baseY: number, speedMin: number, speedMax: number, size: number): void {
    this._size       = size;
    this._hooked     = false;
    this._flying     = false;
    this._currentX   = x;
    this._baseY      = baseY;
    this._currentY   = baseY;
    this._targetX    = this._randomTargetX(x);
    this._moveSpeed  = speedMin + Math.random() * (speedMax - speedMin);
    this._facingLeft = this._targetX < x;
    this._pausing    = false;
    this._flipScale();
    this._tc.localScale    = new Vec3(size, size, size);
    this._tc.worldPosition = new Vec3(x, baseY, 0);
  }

  /** Park far off-screen — called by FishPoolService when benching. */
  park(parkY: number): void {
    this._hooked   = false;
    this._flying   = false;
    this._currentY = parkY;
    this._tc.worldPosition = new Vec3(this._currentX, parkY, 0);
  }

  /** Called by HookController to start the upward launch arc. */
  launch(vx: number, vy: number, gravity: number): void {
    this._hooked  = false;
    this._flying  = true;
    this._flyVX   = vx;
    this._flyVY   = vy;
    this._flyGravity = gravity;
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (VFXService.get().isFrozen) return;
    const dt = p.deltaTime;

    if (this._flying) {
      this._tickFlying(dt);
      return;
    }
    if (this._hooked) return; // position driven externally by HookController

    const t = WorldService.get().getWorldTime();
    this._updateMovement(dt);
    this._currentY = this._baseY + Math.sin(t * FISH_BOB_FREQ + this._size * 10) * FISH_BOB_AMP;
    this._tc.worldPosition = new Vec3(this._currentX, this._currentY, 0);
    this._updateBubble(dt);
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _tickFlying(dt: number): void {
    this._flyVY      += this._flyGravity * dt;
    this._currentX   += this._flyVX * dt;
    this._currentY   += this._flyVY * dt;
    this._tc.worldPosition = new Vec3(this._currentX, this._currentY, 0);
    // Slight spin during flight — rotate around Y for visual fun
    const angle = WorldService.get().getWorldTime() * 200 * (this._flyVX > 0 ? 1 : -1);
    this._tc.worldRotation = Quaternion.fromEuler(new Vec3(0, angle % 360, 0));
  }

  private _updateMovement(dt: number): void {
    if (this._pausing) {
      this._pauseDur -= dt;
      if (this._pauseDur <= 0) {
        this._pausing = false;
        this._targetX = this._randomTargetX(this._currentX);
      }
      return;
    }
    const dx = this._targetX - this._currentX;
    if (Math.abs(dx) < 0.05) {
      this._pausing  = true;
      this._pauseDur = FISH_PAUSE_DUR_MIN + Math.random() * (FISH_PAUSE_DUR_MAX - FISH_PAUSE_DUR_MIN);
      return;
    }
    const dir = Math.sign(dx);
    if (dir > 0 &&  this._facingLeft) { this._facingLeft = false; this._flipScale(); }
    if (dir < 0 && !this._facingLeft) { this._facingLeft = true;  this._flipScale(); }
    this._currentX += dir * this._moveSpeed * dt;
  }

  private _updateBubble(dt: number): void {
    this._bubbleTimer -= dt;
    if (this._bubbleTimer > 0) return;
    this._bubbleTimer = BUBBLE_INTERVAL_MIN + Math.random() * (BUBBLE_INTERVAL_MAX - BUBBLE_INTERVAL_MIN);
    const offsetX = this._facingLeft ? -BUBBLE_SPAWN_OFFSET_X : BUBBLE_SPAWN_OFFSET_X;
    BubblePool.get().acquire(this._currentX + offsetX, this._currentY + BUBBLE_SPAWN_OFFSET_Y);
  }

  private _flipScale(): void {
    this._tc.worldRotation = this._facingLeft
      ? Quaternion.identity
      : Quaternion.fromEuler(new Vec3(0, 180, 0));
  }

  private _randomTargetX(from: number): number {
    let t: number;
    do { t = FISH_LEFT + Math.random() * (FISH_RIGHT - FISH_LEFT); }
    while (Math.abs(t - from) < FISH_MIN_MOVE_DIST);
    return t;
  }
}
