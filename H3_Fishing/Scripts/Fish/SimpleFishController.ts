import {
  Component,
  NetworkingService,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  Quaternion,
  TransformComponent,
  Vec3,
  WorldService,
  component,
  property,
  subscribe,
} from 'meta/worlds';

import { FISH_LEFT, FISH_RIGHT } from '../Constants';
import { Events, type IFishInstance } from '../Types';
import { FishRegistry } from './FishRegistry';

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

  @property() sizeMin  = 0.8;
  @property() sizeMax  = 1.4;
  @property() speedMin = 0.8;
  @property() speedMax = 2.0;

  // ── IFishInstance ────────────────────────────────────────────────────────────
  get fishId(): number { return this._fishId; }
  get worldX(): number { return this._currentX; }
  get worldY(): number { return this._currentY; }
  get size():   number { return this._size; }

  // ── State ────────────────────────────────────────────────────────────────────
  private _fishId     = 0;
  private _size       = 1.0;
  private _facingLeft = false;
  private _caught     = false;

  private _baseY     = 0;
  private _currentX  = 0;
  private _currentY  = 0;
  private _targetX   = 0;
  private _moveSpeed = 1.0;

  private _pausing  = false;
  private _pauseDur = 0;

  private _tc!: TransformComponent;

  // ── Init ─────────────────────────────────────────────────────────────────────
  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._tc    = this.entity.getComponent(TransformComponent)!;
    this._baseY = this._tc.worldPosition.y;
    this._fishId = _nextFishId++;
    FishRegistry.get().addFish(this);
  }

  @subscribe(Events.InitFish)
  private _onInit(p: Events.InitFishPayload): void {
    this._currentX  = p.spawnX;
    this._currentY  = this._baseY;
    this._targetX   = this._randomTargetX(this._currentX);

    const s   = this.sizeMin  + Math.random() * (this.sizeMax  - this.sizeMin);
    const spd = this.speedMin + Math.random() * (this.speedMax  - this.speedMin);
    this._size      = s;
    this._moveSpeed = spd * p.speedMultiplier;
    this._tc.localScale = new Vec3(s, s, s);

    // Apply initial facing direction so the fish is already oriented toward its first target
    this._facingLeft = this._targetX < this._currentX;
    this._flipScale();
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

  private _flipScale(): void {
    const s = this._tc.localScale;
    this._tc.worldRotation = this._facingLeft ? Quaternion.identity : Quaternion.fromEuler(new Vec3(0,180,0));
    //this._tc.localScale = new Vec3(-Math.abs(s.x) * (this._facingLeft ? -1 : 1), s.y, s.z);
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
