import {
  NetworkMode,
  NetworkingService,
  Quaternion,
  Service,
  Vec3,
  WorldService,
  service,
  subscribe,
  type Maybe,
} from 'meta/worlds';

import { Assets } from '../Assets';
import { Events } from '../Types';
import {
  CANVAS_CENTER_WORLD_Y,
  CANVAS_ENTITY_SCALE,
  CANVAS_SIZE,
  CANVAS_WORLD_SPAN,
  FISH_LEFT,
  FISH_RIGHT,
  LAUNCH_EXIT_Y,
  TIP_X,
  TIP_Y,
  WATER_SURFACE_Y,
  worldToCanvas,
} from '../Constants';
import { GoldCoinsAnimatorViewModel } from '../Components/UI/GoldCoinsAnimatorViewModel';

// ── Set to false to disable the debug overlay entirely ─────────────────────────
const DEBUG_CANVAS = false;

const COIN_HALF = 25;                               // half of XAML Image Width/Height="50"
const PX_PER_WU = CANVAS_SIZE / CANVAS_WORLD_SPAN;  // canvas pixels per world unit

// Slot layout
const GRID_SLOTS       = 9;   // 3×3 calibration grid
const FISH_SLOTS       = 4;   // rotating fish-event flashes
const ROD_TIP_SLOTS    = 1;   // tip of the fishing rod
const WATERLINE_COUNT  = 11;  // line of coins at WATER_SURFACE_Y, X −5…+5 every 1 wu
const TOTAL_SLOTS      = GRID_SLOTS + FISH_SLOTS + ROD_TIP_SLOTS + WATERLINE_COUNT;

const SLOT_FISH_BASE      = GRID_SLOTS;
const SLOT_ROD_TIP        = GRID_SLOTS + FISH_SLOTS;
const SLOT_WATERLINE_BASE = SLOT_ROD_TIP + ROD_TIP_SLOTS;

// =============================================================================
//  GoldCoinsDebugService
//
//  Spawns the GoldCoinsAnimator canvas above the water and shows:
//    • A 3×3 reference grid (dim) to calibrate entity scale visually.
//    • Bright markers at key world positions (water surface, fish edges, launch exit).
//    • A flashing coin (1.5× scale, 2 s) for each FishCollected event.
//
//  Tune CANVAS_ENTITY_SCALE in Constants.ts until the grid corners align with
//  the expected world extents, then use worldToCanvas() in the real service.
// =============================================================================

@service()
export class GoldCoinsDebugService extends Service {
  private _vm: Maybe<GoldCoinsAnimatorViewModel> = null;
  private _fishCursor = 0;

  @subscribe(Events.GameStarted)
  async onGameStarted(): Promise<void> {
    if (!DEBUG_CANVAS) return;
    if (NetworkingService.get().isServerContext()) return;

    const entity = await WorldService.get().spawnTemplate({
      templateAsset: Assets.GoldCoinsAnimator,
      position:  new Vec3(0, CANVAS_CENTER_WORLD_Y, -0.1),
      rotation:  Quaternion.identity,
      scale:     new Vec3(CANVAS_ENTITY_SCALE, CANVAS_ENTITY_SCALE, CANVAS_ENTITY_SCALE),
      networkMode: NetworkMode.LocalOnly,
    }).catch(() => null);

    if (!entity) {
      console.error('[GoldCoinsDebug] spawnTemplate failed');
      return;
    }

    this._vm = entity.getComponent(GoldCoinsAnimatorViewModel);
    if (!this._vm) {
      console.error('[GoldCoinsDebug] GoldCoinsAnimatorViewModel not found on entity');
      return;
    }

    this._vm.setCoinCount(TOTAL_SLOTS);
    this._placeGrid();
    this._placeWorldMarkers();
    this._placeRodTip();
    this._placeWaterline();

    console.log(
      `[GoldCoinsDebug] ready | ${PX_PER_WU.toFixed(1)} px/wu` +
      ` | worldY [${(CANVAS_CENTER_WORLD_Y - CANVAS_WORLD_SPAN / 2).toFixed(1)},` +
      ` ${(CANVAS_CENTER_WORLD_Y + CANVAS_WORLD_SPAN / 2).toFixed(1)}]` +
      ` | entity scale ${CANVAS_ENTITY_SCALE}`,
    );
  }

  @subscribe(Events.FishCollected)
  onFishCollected(p: Events.FishCollectedPayload): void {
    if (!DEBUG_CANVAS || !this._vm) return;
    if (NetworkingService.get().isServerContext()) return;

    const slot = SLOT_FISH_BASE + this._fishCursor;
    this._fishCursor = (this._fishCursor + 1) % FISH_SLOTS;

    const { x, y } = worldToCanvas(p.x, p.y);
    this._vm.setCoin(slot, x, y, 1.5, 1.5, 0, 1);
    console.log(
      `[GoldCoinsDebug] fish[${p.fishId}] world(${p.x.toFixed(2)}, ${p.y.toFixed(2)})` +
      ` → canvas(${x.toFixed(0)}, ${y.toFixed(0)})`,
    );

    setTimeout(() => {
      if (this._vm) this._vm.setCoin(slot, x, y, 1.5, 1.5, 0, 0);
    }, 2000);
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  /** 3×3 grid at canvas px (100,100) … (500,500). Low opacity — calibration only. */
  private _placeGrid(): void {
    const pts = [
      { cx: 100, cy: 100 }, { cx: 300, cy: 100 }, { cx: 500, cy: 100 },
      { cx: 100, cy: 300 }, { cx: 300, cy: 300 }, { cx: 500, cy: 300 },
      { cx: 100, cy: 500 }, { cx: 300, cy: 500 }, { cx: 500, cy: 500 },
    ];
    for (let i = 0; i < pts.length; i++) {
      const { cx, cy } = pts[i];
      this._vm!.setCoin(i, cx - COIN_HALF, cy - COIN_HALF, 0.6, 0.6, 0, 0.25);
    }
  }

  /**
   * Bright coins at key world positions so you can see where the mapping lands.
   * Uses the FISH_SLOTS (will be overwritten by FishCollected events on the first run).
   */
  private _placeWorldMarkers(): void {
    const markers = [
      { label: 'water_surface_center', wx: 0,          wy: WATER_SURFACE_Y },
      { label: 'water_surface_left',   wx: FISH_LEFT,  wy: WATER_SURFACE_Y },
      { label: 'water_surface_right',  wx: FISH_RIGHT, wy: WATER_SURFACE_Y },
      { label: 'launch_exit_center',   wx: 0,          wy: LAUNCH_EXIT_Y   },
    ] as const;

    for (let i = 0; i < markers.length; i++) {
      const { label, wx, wy } = markers[i];
      const { x, y } = worldToCanvas(wx, wy);
      this._vm!.setCoin(SLOT_FISH_BASE + i, x, y, 1.0, 1.0, 0, 0.85);
      console.log(`[GoldCoinsDebug]  ${label}: world(${wx}, ${wy}) → canvas(${x.toFixed(0)}, ${y.toFixed(0)})`);
    }
  }

  /** Bright coin at the rod tip — verify the rod tip world position maps correctly. */
  private _placeRodTip(): void {
    const { x, y } = worldToCanvas(TIP_X, TIP_Y);
    this._vm!.setCoin(SLOT_ROD_TIP, x, y, 1.2, 1.2, 0, 1.0);
    console.log(`[GoldCoinsDebug]  rod_tip: world(${TIP_X}, ${TIP_Y}) → canvas(${x.toFixed(0)}, ${y.toFixed(0)})`);
  }

  /** Row of coins at WATER_SURFACE_Y, X = −5 … +5 every 1 wu. */
  private _placeWaterline(): void {
    for (let i = 0; i < WATERLINE_COUNT; i++) {
      const wx = -5 + i;
      const { x, y } = worldToCanvas(wx, WATER_SURFACE_Y);
      this._vm!.setCoin(SLOT_WATERLINE_BASE + i, x, y, 0.5, 0.5, 0, 0.6);
    }
    console.log(`[GoldCoinsDebug]  waterline: ${WATERLINE_COUNT} coins at Y=${WATER_SURFACE_Y}`);
  }
}
