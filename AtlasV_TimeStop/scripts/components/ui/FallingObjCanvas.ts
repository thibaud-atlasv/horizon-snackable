import {
  Component,
  CustomUiComponent,
  ExecuteOn,
  NetworkingService,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  TextureAsset,
  UiViewModel,
  component,
  property,
  subscribe,
  uiViewModel,
} from 'meta/worlds';
import type { Maybe, OnWorldUpdateEventPayload } from 'meta/worlds';
import { Assets } from '../../Assets';
import { WIDTH, HEIGHT } from '../../Constants';
import { Events, type FallingObjRenderState } from '../../Types';

// ── Canvas / layout constants ──────────────────────────────────────────────
// Must match the XAML root Panel width/height.
const CANVAS_W = 1920;
const CANVAS_H = 3640;
const PX_PER_WU_X = CANVAS_W / WIDTH;
const PX_PER_WU_Y = CANVAS_H / HEIGHT;
const MAX_LOGS = 10;

// Native bamboo sprite dimensions (px).
const SPRITE_H = 159;
const SPRITE_LEFT_W = 175;
const SPRITE_CENTER_W = 192;
const SPRITE_RIGHT_W = 275;
const SPRITE_TOTAL_W = SPRITE_LEFT_W + SPRITE_CENTER_W + SPRITE_RIGHT_W;
const LEFT_FRAC = SPRITE_LEFT_W / SPRITE_TOTAL_W;
const CENTER_FRAC = SPRITE_CENTER_W / SPRITE_TOTAL_W;
const RIGHT_FRAC = SPRITE_RIGHT_W / SPRITE_TOTAL_W;

// ── Slice VFX constants ────────────────────────────────────────────────────
// Native texture sizes (px).
const SLICE_FX_W = 400;
const SLICE_FX_H = 503;
const SLICE_LEFT_W = 386;
const SLICE_LEFT_H = 193;
const SLICE_RIGHT_W = 408;
const SLICE_RIGHT_H = 193;

// Display sizes (px on canvas) — independent of log width.
const SLICE_DISPLAY_H = 200;
const SLICE_FX_DISPLAY_W = SLICE_FX_W * (SLICE_DISPLAY_H / SLICE_FX_H);
const SLICE_L_DISPLAY_W = SLICE_LEFT_W * (SLICE_DISPLAY_H / SLICE_LEFT_H);
const SLICE_R_DISPLAY_W = SLICE_RIGHT_W * (SLICE_DISPLAY_H / SLICE_RIGHT_H);

// Physics of ejected halves (canvas px / s).
const SLICE_VX_BASE = 320;   // horizontal eject speed
const SLICE_VY_BASE = -180;  // upward burst (canvas Y is down → negative = up)
const SLICE_GRAVITY = 900;   // canvas px/s²
const SLICE_TORQUE = 200;   // deg/s
const SLICE_DURATION = 0.65;  // seconds until fully faded

// ── ViewModel ──────────────────────────────────────────────────────────────

@uiViewModel()
export class LogItemViewModel extends UiViewModel {
  translateX: number = 0;
  translateY: number = 0;
  rotation: number = 0;
  scaleX: number = 1;
  scaleY: number = 1;
  itemWidth: number = 1;
  itemHeight: number = 1;
  alpha: number = 1;
  isVisible: boolean = false;
  texture: Maybe<TextureAsset> = null;
}

@uiViewModel()
export class FallingObjCanvasData extends UiViewModel {
  items: readonly LogItemViewModel[] = [];
  shakeX: number = 0;
  overlayAlpha: number = 0;
}

// ── Internal slice state ───────────────────────────────────────────────────

interface SliceState {
  // canvas-space position of each piece
  fxPx: number; fxPy: number;
  lPx: number; lPy: number; lVx: number; lVy: number; lRot: number;
  rPx: number; rPy: number; rVx: number; rVy: number; rRot: number;
  angle: number;   // log angle at freeze (radians)
  elapsed: number;
  // ViewModel items for the 3 pieces
  fxItem: LogItemViewModel;
  lItem: LogItemViewModel;
  rItem: LogItemViewModel;
}

// ── Component ─────────────────────────────────────────────────────────────

@component()
export class FallingObjCanvas extends Component {
  @property() debugMode: boolean = false;

  private _vm = new FallingObjCanvasData();
  private _customUi: Maybe<CustomUiComponent> = null;
  private _items: LogItemViewModel[] = [];

  // Last render states — Map for position lookup, array to find slot index.
  private _lastStates: Map<number, FallingObjRenderState> = new Map();
  private _lastStatesArray: FallingObjRenderState[] = [];

  // Frozen log IDs — these slots are hidden immediately and kept hidden.
  private _frozenIds: Set<number> = new Set();

  // Active slice animations.
  private _slices: SliceState[] = [];

  // Game over shake + overlay state.
  private _shakeElapsed: number = 0;
  private _shakeDuration: number = 0;
  private _overlayElapsed: number = 0;
  private _overlayDuration: number = 0;

  // ── Lifecycle ────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._customUi = this.entity.getComponent(CustomUiComponent);
    if (this._customUi) this._customUi.dataContext = this._vm;

    // Pre-allocate log render slots: MAX_LOGS × 3 (left, center, right)
    for (let i = 0; i < MAX_LOGS; i++) {
      this._items.push(this._makeItem(Assets.BambooLeft));
      this._items.push(this._makeItem(Assets.BambooCenter));
      this._items.push(this._makeItem(Assets.BambooRight));
    }
    // Debug hitbox slots
    for (let i = 0; i < MAX_LOGS; i++) {
      this._items.push(this._makeItem(Assets.Debug));
    }

    if (this.debugMode) this._spawnDebugMarkers();
    this._vm.items = [...this._items];
  }

  // ── Log render ───────────────────────────────────────────────────────

  @subscribe(Events.RenderFallingObjs)
  onRender(p: Events.RenderFallingObjsPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    // Update last-known states for position/slot lookup on freeze.
    this._lastStates.clear();
    this._lastStatesArray = p.states;
    for (const s of p.states) this._lastStates.set(s.objId, s);

    for (let i = 0; i < MAX_LOGS; i++) {
      const left = this._items[i * 3];
      const center = this._items[i * 3 + 1];
      const right = this._items[i * 3 + 2];
      const state = p.states[i];
      const dbg = this._items[MAX_LOGS * 3 + i];

      if (!state || state.alpha <= 0 || this._frozenIds.has(state.objId)) {
        left.isVisible = center.isVisible = right.isVisible = dbg.isVisible = false;
        continue;
      }

      const px = (state.cx / WIDTH) * CANVAS_W;
      const py = -(state.cy / HEIGHT) * CANVAS_H;
      const rotDeg = -state.angle * (180 / Math.PI);

      const totalW = state.scaleX * PX_PER_WU_X;
      const h = state.scaleY * PX_PER_WU_Y;
      const leftW = LEFT_FRAC * totalW;
      const centerW = CENTER_FRAC * totalW;
      const rightW = RIGHT_FRAC * totalW;

      const assemblyShiftX = (rightW - leftW) / 2;
      const cos = Math.cos(state.angle);
      const sin = Math.sin(state.angle);
      const overlap = 2;
      const leftOffX = -assemblyShiftX - (centerW / 2 + leftW / 2 - overlap);
      const centerOffX = -assemblyShiftX;
      const rightOffX = -assemblyShiftX + centerW / 2 + rightW / 2 - overlap;

      left.isVisible = true;
      left.translateX = px + leftOffX * cos;
      left.translateY = py - leftOffX * sin;
      left.rotation = rotDeg; left.scaleX = 1; left.scaleY = 1;
      left.itemWidth = leftW; left.itemHeight = h;

      center.isVisible = true;
      center.translateX = px + centerOffX * cos;
      center.translateY = py - centerOffX * sin;
      center.rotation = rotDeg; center.scaleX = 1; center.scaleY = 1;
      center.itemWidth = centerW; center.itemHeight = h;

      right.isVisible = true;
      right.translateX = px + rightOffX * cos;
      right.translateY = py - rightOffX * sin;
      right.rotation = rotDeg; right.scaleX = 1; right.scaleY = 1;
      right.itemWidth = rightW; right.itemHeight = h;

      dbg.isVisible = false;
      dbg.translateX = px; dbg.translateY = py; dbg.rotation = rotDeg;
      dbg.scaleX = 1; dbg.scaleY = 1; dbg.itemWidth = totalW; dbg.itemHeight = h;
    }
  }

  // ── Slice VFX ────────────────────────────────────────────────────────

  @subscribe(Events.FallingObjFrozen)
  onFallingObjFrozen(p: Events.FallingObjFrozenPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const state = this._lastStates.get(p.objId);
    if (!state) return;

    this._frozenIds.add(p.objId);

    // Hide the log's 3 render items immediately so the slice replaces it.
    const slotIndex = this._lastStatesArray.indexOf(state);
    if (slotIndex >= 0 && slotIndex < MAX_LOGS) {
      this._items[slotIndex * 3].isVisible = false;
      this._items[slotIndex * 3 + 1].isVisible = false;
      this._items[slotIndex * 3 + 2].isVisible = false;
    }

    // Canvas-space position of the log center at freeze.
    const px = (state.cx / WIDTH) * CANVAS_W;
    const py = -(state.cy / HEIGHT) * CANVAS_H;
    const angle = state.angle;

    // Eject direction follows the log's local X axis (perpendicular to long axis).
    // Left half goes left (along -local X), right half goes right (+local X).
    // In canvas space: local X is (cos(angle), -sin(angle)) for CCW angle.
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Half-width offset so pieces start flush at center.
    const halfL = SLICE_L_DISPLAY_W / 2;
    const halfR = SLICE_R_DISPLAY_W / 2;

    // Left piece starts at center, offset to the left along log axis.
    const lStartX = px - halfL * cos;
    const lStartY = py + halfL * sin;  // canvas Y is down

    // Right piece starts at center, offset to the right along log axis.
    const rStartX = px + halfR * cos;
    const rStartY = py - halfR * sin;

    // Velocity: eject along log axis + upward burst. Left goes left, right goes right.
    const lVx = -SLICE_VX_BASE * cos + SLICE_VY_BASE * (-sin);
    const lVy = -SLICE_VX_BASE * (-sin) + SLICE_VY_BASE * cos;  // canvas Y
    const rVx = SLICE_VX_BASE * cos + SLICE_VY_BASE * (-sin);
    const rVy = SLICE_VX_BASE * (-sin) + SLICE_VY_BASE * cos;

    const rotDeg = -angle * (180 / Math.PI);

    const fxItem = this._makeItem(Assets.SlicedFX);
    const lItem = this._makeItem(Assets.SlicedLeft);
    const rItem = this._makeItem(Assets.SlicedRight);

    // FX display size keeps native aspect ratio, based on display height.
    const fxDisplayH = SLICE_DISPLAY_H * (SLICE_FX_H / SLICE_LEFT_H);
    fxItem.isVisible = true; fxItem.translateX = px; fxItem.translateY = py;
    fxItem.rotation = rotDeg; fxItem.scaleX = 0.5; fxItem.scaleY = 0.5; fxItem.alpha = 0;
    fxItem.itemWidth = SLICE_FX_DISPLAY_W; fxItem.itemHeight = fxDisplayH;

    lItem.isVisible = true; lItem.translateX = lStartX; lItem.translateY = lStartY;
    lItem.rotation = rotDeg; lItem.scaleX = 1; lItem.scaleY = 1;
    lItem.itemWidth = SLICE_L_DISPLAY_W; lItem.itemHeight = SLICE_DISPLAY_H;

    rItem.isVisible = true; rItem.translateX = rStartX; rItem.translateY = rStartY;
    rItem.rotation = rotDeg; rItem.scaleX = 1; rItem.scaleY = 1;
    rItem.itemWidth = SLICE_R_DISPLAY_W; rItem.itemHeight = SLICE_DISPLAY_H;

    // Append to the dynamic items list and rebuild the VM array.
    this._items.push(fxItem, lItem, rItem);
    this._vm.items = [...this._items];

    this._slices.push({
      fxPx: px, fxPy: py,
      lPx: lStartX, lPy: lStartY, lVx, lVy, lRot: rotDeg,
      rPx: rStartX, rPy: rStartY, rVx, rVy, rRot: rotDeg,
      angle, elapsed: 0,
      fxItem, lItem, rItem,
    });
  }

  // ── Slice animation update ────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    const dt = payload.deltaTime;
    // Shake animation: dampened sine oscillation.
    if (this._shakeDuration > 0) {
      this._shakeElapsed += dt;
      const t = this._shakeElapsed / this._shakeDuration;
      if (t >= 1) {
        this._shakeDuration = 0;
        this._vm.shakeX = 0;
      } else {
        const damping = 1 - t;
        this._vm.shakeX = Math.sin(t * Math.PI * 8) * 60 * damping;
      }
    }
    // Overlay: fade in quickly then fade out.
    if (this._overlayDuration > 0) {
      this._overlayElapsed += dt;
      const t = this._overlayElapsed / this._overlayDuration;
      if (t >= 1) {
        this._overlayDuration = 0;
        this._vm.overlayAlpha = 0;
      } else {
        // Peak at t=0.15, fade out after.
        this._vm.overlayAlpha = t < 0.15
          ? t / 0.15
          : 1 - (t - 0.15) / 0.85;
      }
    }

    const toRemove: SliceState[] = [];

    for (const sl of this._slices) {
      sl.elapsed += dt;
      const t = Math.min(sl.elapsed / SLICE_DURATION, 1);
      const alpha = 1 - t;

      // FX: pop-in (scale 0.5→1 over first 20%) then fade out.
      const fxAlpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
      sl.fxItem.scaleX = sl.fxItem.scaleY = t < 0.2 ? 0.5 + (t / 0.2) * 0.5 : 1;
      sl.fxItem.alpha = Math.max(0, fxAlpha);
      sl.fxItem.isVisible = fxAlpha > 0.02;

      // Physics integration for left piece.
      sl.lVy += SLICE_GRAVITY * dt;
      sl.lPx += sl.lVx * dt;
      sl.lPy += sl.lVy * dt;
      sl.lRot -= SLICE_TORQUE * dt;

      sl.lItem.translateX = sl.lPx;
      sl.lItem.translateY = sl.lPy;
      sl.lItem.rotation = sl.lRot;
      sl.lItem.alpha = alpha;
      sl.lItem.isVisible = alpha > 0.02;

      // Physics integration for right piece.
      sl.rVy += SLICE_GRAVITY * dt;
      sl.rPx += sl.rVx * dt;
      sl.rPy += sl.rVy * dt;
      sl.rRot += SLICE_TORQUE * dt;

      sl.rItem.translateX = sl.rPx;
      sl.rItem.translateY = sl.rPy;
      sl.rItem.rotation = sl.rRot;
      sl.rItem.alpha = alpha;
      sl.rItem.isVisible = alpha > 0.02;

      if (t >= 1) toRemove.push(sl);
    }

    // Clean up finished slices.
    for (const sl of toRemove) {
      sl.fxItem.isVisible = false;
      sl.lItem.isVisible = false;
      sl.rItem.isVisible = false;
      this._slices.splice(this._slices.indexOf(sl), 1);
      // Remove items from pool.
      const fi = this._items.indexOf(sl.fxItem);
      if (fi !== -1) this._items.splice(fi, 3);
      this._vm.items = [...this._items];
    }
  }

  // ── Game over feedback ────────────────────────────────────────────────

  @subscribe(Events.GameOverShake)
  onGameOverShake(_p: Events.GameOverShakePayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._shakeElapsed = 0;
    this._shakeDuration = 0.5;
    this._overlayElapsed = 0;
    this._overlayDuration = 1.2;
  }

  // ── Restart ───────────────────────────────────────────────────────────

  @subscribe(Events.PrepareRound)
  onPrepareRound(_p: Events.PrepareRoundPayload): void {
    this._frozenIds.clear();
    this._lastStates.clear();
    this._lastStatesArray = [];
  }

  @subscribe(Events.Restart)
  onRestart(_p: Events.RestartPayload): void {
    // Hide all dynamic slice items and clear state.
    for (const sl of this._slices) {
      sl.fxItem.isVisible = sl.lItem.isVisible = sl.rItem.isVisible = false;
    }
    this._slices = [];
    this._frozenIds.clear();
    this._lastStates.clear();
    // Rebuild items without slice items.
    this._items = this._items.filter(
      item => item.texture !== Assets.SlicedFX &&
        item.texture !== Assets.SlicedLeft &&
        item.texture !== Assets.SlicedRight
    );
    for (const item of this._items) item.isVisible = false;
    this._vm.items = [...this._items];
    this._vm.shakeX = 0;
    this._vm.overlayAlpha = 0;
    this._shakeElapsed = 0;
    this._shakeDuration = 0;
    this._overlayElapsed = 0;
    this._overlayDuration = 0;
  }

  // ── Internal ─────────────────────────────────────────────────────────

  private _makeItem(texture: TextureAsset): LogItemViewModel {
    const item = new LogItemViewModel();
    item.texture = texture;
    item.isVisible = false;
    return item;
  }

  // ── Debug ────────────────────────────────────────────────────────────

  private _spawnDebugMarkers(): void {
    const sq = 300;
    const hw = CANVAS_W / 2 - sq / 2;
    const hh = CANVAS_H / 2 - sq / 2;
    const pts: Array<[number, number, number]> = [
      [0, 0, 0],
      [-hw, hh, -135],
      [hw, hh, -45],
      [-hw, -hh, 135],
      [hw, -hh, 45],
      [-hw, 0, 180],
      [hw, 0, 0],
      [0, hh, -90],
      [0, -hh, 90],
    ];
    for (const [x, y, rot] of pts) {
      const item = this._makeItem(Assets.BambooCenter);
      item.translateX = x; item.translateY = y; item.rotation = rot;
      item.itemWidth = sq; item.itemHeight = sq; item.isVisible = true;
      this._items.push(item);
    }

    const refTotalW = SPRITE_H * 3 * (SPRITE_TOTAL_W / SPRITE_H);
    const refH = SPRITE_H * 3;
    const refLeftW = LEFT_FRAC * refTotalW;
    const refCenterW = CENTER_FRAC * refTotalW;
    const refRightW = RIGHT_FRAC * refTotalW;
    const dbgAngle = 45 * (Math.PI / 180);
    const dbgCos = Math.cos(dbgAngle);
    const dbgSin = Math.sin(dbgAngle);
    const refOverlap = 2;
    const refLeftOffX = -(refCenterW / 2 + refLeftW / 2 - refOverlap);
    const refRightOffX = refCenterW / 2 + refRightW / 2 - refOverlap;

    const dbgLeft = this._makeItem(Assets.BambooLeft);
    dbgLeft.translateX = refLeftOffX * dbgCos; dbgLeft.translateY = -refLeftOffX * dbgSin;
    dbgLeft.rotation = -45; dbgLeft.itemWidth = refLeftW; dbgLeft.itemHeight = refH;
    dbgLeft.isVisible = true; this._items.push(dbgLeft);

    const dbgCenter = this._makeItem(Assets.BambooCenter);
    dbgCenter.translateX = 0; dbgCenter.translateY = 0; dbgCenter.rotation = -45;
    dbgCenter.itemWidth = refCenterW; dbgCenter.itemHeight = refH;
    dbgCenter.isVisible = true; this._items.push(dbgCenter);

    const dbgRight = this._makeItem(Assets.BambooRight);
    dbgRight.translateX = refRightOffX * dbgCos; dbgRight.translateY = -refRightOffX * dbgSin;
    dbgRight.rotation = -45; dbgRight.itemWidth = refRightW; dbgRight.itemHeight = refH;
    dbgRight.isVisible = true; this._items.push(dbgRight);
  }
}
