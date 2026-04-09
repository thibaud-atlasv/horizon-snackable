import {
  Component,
  type Maybe,
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
  BUBBLE_INTERVAL_MIN, BUBBLE_INTERVAL_MAX,
  BUBBLE_SPAWN_OFFSET_X, BUBBLE_SPAWN_OFFSET_Y,
} from '../Constants';
import { Events, type IFishInstance } from '../Types';
import { FishRegistry } from './FishRegistry';
import { BubblePool } from './BubblePool';

const PAUSE_DUR_MIN = 1.2;
const PAUSE_DUR_MAX = 3.2;
const BOB_AMP       = 0.06;
const BOB_FREQ      = 0.55;
const MIN_MOVE_DIST = 2.5;

let _nextFishId = 1;

// =============================================================================
//  SimpleFishController
//
//  Minimal fish — single entity, no child meshes.
//  Handles movement, bob, scale, and direction flip only.
//  Size and speed are configured via @property() in the editor.
//
//  ── Editor setup ─────────────────────────────────────────────────────────────
//  Place on the fish template entity. No child entities required.
// =============================================================================

@component()
export class SimpleFishController extends Component implements IFishInstance {


  // ── IFishInstance ────────────────────────────────────────────────────────────
  get fishId(): number { return this._fishId; }
  get defId():  number { return this._defId; }
  get worldX(): number { return this._currentX; }
  get worldY(): number { return this._currentY; }
  get size():   number { return this._size; }

  // ── State ────────────────────────────────────────────────────────────────────
  private _fishId     = 0;
  private _defId      = 0;
  private _size       = 1.0;
  private _facingLeft = false;
  private _caught     = true;

  private _baseY     = 0;
  private _currentX  = 0;
  private _currentY  = 0;
  private _targetX   = 0;
  private _moveSpeed = 1.0;

  private _pausing  = false;
  private _pauseDur = 0;

  private _bubbleTimer = 100;

  private _tc!: TransformComponent;

  // ── Init ─────────────────────────────────────────────────────────────────────

  @subscribe(OnEntityCreateEvent)
  created(): void {
    this._tc    = this.entity.getComponent(TransformComponent)!;
  }

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._baseY = this._tc.worldPosition.y;
  }

  @subscribe(Events.InitFish)
  private _onInit(p: Events.InitFishPayload): void {
    this._fishId = _nextFishId++;
    this._defId     = p.defId;
    this._currentX  = p.spawnX;
    this._currentY  = this._baseY;
    this._targetX   = this._randomTargetX(this._currentX);
    this._caught = false;

    this._size = this._tc ? this._tc.localScale.x : 1.0;
    const spd = p.speedMin + Math.random() * (p.speedMax - p.speedMin);
    this._moveSpeed = spd * p.speedMultiplier;

    // Apply initial facing direction so the fish is already oriented toward its first target
    this._facingLeft = this._targetX < this._currentX;
    this._flipScale();

    // Spread initial bubble timers across a full 2× window so fish don't all emit in sync
    this._bubbleTimer = Math.random() * BUBBLE_INTERVAL_MAX * 2;
    FishRegistry.get().addFish(this);
  }

  // ── IFishInstance impl ────────────────────────────────────────────────────────
  setCaught(_v: boolean): void {
    this._caught = _v;
  }

  setPosition(x: number, y: number): void {
    this._currentX = x;
    this._currentY = y;
    this._tc.worldPosition = new Vec3(x, y, 0);
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this._caught) return;
    const dt = p.deltaTime;
    const t  = WorldService.get().getWorldTime();
    this._updateMovement(dt);
    this._currentY = this._baseY + Math.sin(t * BOB_FREQ + this._size * 10) * BOB_AMP;
    this._tc.worldPosition = new Vec3(this._currentX, this._currentY, 0);
    this._updateBubble(dt);
  }

  // ── Private ───────────────────────────────────────────────────────────────────
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
      this._pauseDur = PAUSE_DUR_MIN + Math.random() * (PAUSE_DUR_MAX - PAUSE_DUR_MIN);
      return;
    }
    const dir = Math.sign(dx);
    if (dir > 0 &&  this._facingLeft) { this._facingLeft = false; this._flipScale(); }
    if (dir < 0 && !this._facingLeft) { this._facingLeft = true;  this._flipScale(); }
    this._currentX += dir * this._moveSpeed * dt;
  }

  private async _updateBubble(dt: number): Promise<void> {
    this._bubbleTimer -= dt;
    if (this._bubbleTimer > 0) return;

    this._bubbleTimer = BUBBLE_INTERVAL_MIN + Math.random() * (BUBBLE_INTERVAL_MAX - BUBBLE_INTERVAL_MIN);

    const offsetX = this._facingLeft ? -BUBBLE_SPAWN_OFFSET_X : BUBBLE_SPAWN_OFFSET_X;
    const spawnX  = this._currentX + offsetX;
    const spawnY  = this._currentY + BUBBLE_SPAWN_OFFSET_Y;

    BubblePool.get().acquire(spawnX, spawnY);
  }

  private _flipScale(): void {
    this._tc.worldRotation = this._facingLeft ? Quaternion.identity : Quaternion.fromEuler(new Vec3(0,180,0));
  }

  private _randomTargetX(from: number): number {
    let t: number;
    do { t = FISH_LEFT + Math.random() * (FISH_RIGHT - FISH_LEFT); }
    while (Math.abs(t - from) < MIN_MOVE_DIST);
    return t;
  }

  @subscribe(Events.FishHooked)
  private _onFishHooked(p: Events.FishHookedPayload): void {
    if (p.fishId !== this._fishId) return;
    this.setCaught(true);
  }

  @subscribe(Events.FishCaught)
  private _onFishCaught(p: Events.FishCaughtPayload): void {
    if (p.fishId !== this._fishId) return;
    this.entity.destroy();
  }
}
