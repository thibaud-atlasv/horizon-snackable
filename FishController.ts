import {
  Color,
  ColorComponent,
  Component,
  NetworkingService,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  TransformComponent,
  Vec3,
  WorldService,
  component,
  property,
  subscribe,
  type Entity,
} from 'meta/worlds';

import { FISH_LEFT, FISH_RIGHT } from '../Constants';
import { Events, type IFishInstance } from '../Types';
import { FishRegistry } from './FishRegistry';
import { STANDARD_FISH_CONFIGS } from './FishDefs';

// ─── Local animation constants ────────────────────────────────────────────────
const PAUSE_DUR_MIN      = 1.2;
const PAUSE_DUR_MAX      = 3.2;
const BOB_AMP            = 0.06;
const BOB_FREQ           = 0.55;
const BLINK_INTERVAL_MIN = 2.5;
const BLINK_INTERVAL_MAX = 3.5;
const BLINK_DUR          = 0.12;
const PUPIL_INTERVAL_MIN = 1.5;
const PUPIL_INTERVAL_MAX = 3.0;
const PUPIL_LOOK_OFFSET  = 0.2;
const MIN_MOVE_DIST      = 2.5;

let _nextFishId = 1;

// =============================================================================
//  FishController
//
//  Implements IFishInstance — registered with FishRegistry on start.
//  Receives sa config via EvInitFish (targeted event from FishSpawnService).
//  Lit sa position de spawn depuis son propre transform (posé par FishSpawnService).
//
//  ── Editor setup ─────────────────────────────────────────────────────────────
//  Assign child entities in the inspector:
//    bodyEntity  — main body mesh (ColorComponent for body tint)
//    tailEntity  — tail mesh
//    finEntity   — fin mesh
//    eyeEntity   — eye group (scale for blink)
//    pupilEntity — pupil (local Y offset for wander/caught look)
// =============================================================================

@component()
export class FishController extends Component implements IFishInstance {

  @property() bodyEntity  ?: Entity;
  @property() tailEntity  ?: Entity;
  @property() finEntity   ?: Entity;
  @property() eyeEntity   ?: Entity;
  @property() pupilEntity ?: Entity;

  // ── IFishInstance ──────────────────────────────────────────────────────────
  get fishId(): number { return this._fishId; }
  get worldX(): number { return this._currentX; }
  get worldY(): number { return this._currentY; }
  get size():   number { return this._size; }

  // ── State ──────────────────────────────────────────────────────────────────
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

  private _blinking   = false;
  private _blinkTimer = 0;
  private _blinkDur   = 0;

  private _pupilTimer = 0;

  private _tc!: TransformComponent;

  // ── Init ───────────────────────────────────────────────────────────────────
  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._tc = this.entity.getComponent(TransformComponent)!;
    this._baseY = this._tc.worldPosition.y;
    this._fishId = _nextFishId++;
    this._blinkTimer = BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN);
    this._pupilTimer = PUPIL_INTERVAL_MIN + Math.random() * (PUPIL_INTERVAL_MAX - PUPIL_INTERVAL_MIN);
    FishRegistry.get().addFish(this);
  }

  /** Targeted event — FishSpawnService sends this immediately after spawning. */
  @subscribe(Events.InitFish)
  private _onInit(p: Events.InitFishPayload): void {
    // Lire spawnX/baseY depuis le payload — worldPosition n'est pas encore
    // appliqué au transform quand cet event est dispatché.
    this._currentX = p.spawnX;
    this._targetX  = this._randomTargetX(this._currentX);
    //this._baseY    = p.baseY;
    this._currentY = this._baseY;

    const cfg = STANDARD_FISH_CONFIGS[p.defId];
    if (!cfg) return;

    const s   = cfg.sizeMin  + Math.random() * (cfg.sizeMax  - cfg.sizeMin);
    const spd = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
    this._size      = s;
    this._moveSpeed = spd * p.speedMultiplier;
    this._tc.localScale = new Vec3(s, s, s);

    const set = (e: Entity | undefined, c: { r: number; g: number; b: number }) => {
      if (!e) return;
      const cc = e.getComponent(ColorComponent);
      if (cc) cc.color = new Color(c.r, c.g, c.b, 1);
    };
    set(this.bodyEntity, cfg.bodyColor);
    set(this.tailEntity, cfg.tailColor);
    set(this.finEntity,  cfg.finColor);
  }

  // ── IFishInstance impl ─────────────────────────────────────────────────────
  setCaught(v: boolean): void {
    this._caught = v;
    if (v) this._setPupilLocalY(PUPIL_LOOK_OFFSET);
  }

  setPosition(x: number, y: number): void {
    this._currentX = x;
    this._currentY = y;
    this._tc.localPosition = new Vec3(x, y, 0);
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const dt = p.deltaTime;
    const t  = WorldService.get().getWorldTime();
    this._updateBlink(dt);
    if (this._caught) return;
    this._updateMovement(dt);
    this._updateBob(t);
    this._tc.localPosition = new Vec3(this._currentX, this._currentY, 0);
    this._updatePupilWander(dt);
  }

  // ── Private ────────────────────────────────────────────────────────────────
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

  private _updateBob(t: number): void {
    this._currentY = this._baseY + Math.sin(t * BOB_FREQ + this._size * 10) * BOB_AMP;
  }

  private _updateBlink(dt: number): void {
    if (this._blinking) {
      this._blinkDur -= dt;
      if (this._blinkDur <= 0) {
        this._blinking  = false;
        this._setEyeScale(this._size * 0.12, this._size * 0.12);
        this._blinkTimer = BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN);
      }
    } else {
      this._blinkTimer -= dt;
      if (this._blinkTimer <= 0) {
        this._blinking = true;
        this._blinkDur = BLINK_DUR;
        this._setEyeScale(this._size * 0.18, this._size * 0.018);
      }
    }
  }

  private _updatePupilWander(dt: number): void {
    this._pupilTimer -= dt;
    if (this._pupilTimer <= 0) {
      const offset = Math.random() < 0.1 ? PUPIL_LOOK_OFFSET * 0.5 * this._size : 0;
      this._setPupilLocalY(offset);
      this._pupilTimer = PUPIL_INTERVAL_MIN + Math.random() * (PUPIL_INTERVAL_MAX - PUPIL_INTERVAL_MIN);
    }
  }

  private _flipScale(): void {
    const s = this._tc.localScale;
    this._tc.localScale = new Vec3(-Math.abs(s.x) * (this._facingLeft ? -1 : 1), s.y, s.z);
  }

  private _setEyeScale(w: number, h: number): void {
    const tc = this.eyeEntity?.getComponent(TransformComponent);
    if (tc) tc.localScale = new Vec3(w, h, 1);
  }

  private _setPupilLocalY(y: number): void {
    const tc = this.pupilEntity?.getComponent(TransformComponent);
    if (tc) tc.localPosition = new Vec3(tc.localPosition.x, y, tc.localPosition.z);
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
