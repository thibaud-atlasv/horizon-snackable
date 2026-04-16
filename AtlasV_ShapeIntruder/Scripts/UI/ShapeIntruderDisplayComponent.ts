import {
  Component, component,
  subscribe,
  CustomUiComponent,
  OnEntityCreateEvent,
  OnWorldUpdateEvent, ExecuteOn,
  EventService,
  TextureAsset,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import {
  ShapeItemViewModel,
  onAnswerOptionPressed,
  BTN_BG_COLORS,
  BTN_BORDER_COLORS,
  ShapeIntruderDisplayViewModel,
} from './ShapeIntruderDisplayViewModel';
import type { ShapeAnswerOptionPayload } from './ShapeIntruderDisplayViewModel';
import { Events } from '../Types';
import type { IShapeInstance, IOption } from '../Types';
import { COLOR_DEFS } from '../Defs/ShapeDefs';
import type { ColorKey } from '../Defs/ShapeDefs';

import {
  ZONE_SIZE,
  CORRECT_BTN_BG, CORRECT_BTN_BORDER, CORRECT_OVERLAY,
  WRONG_BTN_BG, WRONG_BTN_BORDER, WRONG_OVERLAY,
  OVERLAY_TARGET_OPACITY, OVERLAY_DURATION_SEC,
  WRONG_FADE_DURATION_SEC, WRONG_FADE_TARGET,
  WRONG_PULSE_DURATION_SEC, WRONG_PULSE_PEAK,
  DEBUG_GRID_TEST,
} from '../Constants';
import { SHAPE_TEXTURE_MAP } from '../Assets';

@component()
export class ShapeIntruderDisplayComponent extends Component {
  private _shapeIntruderDisplayVM = new ShapeIntruderDisplayViewModel();
  private _shapes: IShapeInstance[] = [];
  private _currentOptions: IOption[] = [];
  private _originalScales: number[] = [];
  private _matchingIndices: number[] = [];
  private _nonMatchingIndices: number[] = [];
  private _score: number = 0;

  // Animation elapsed time in seconds; -1 = inactive
  private _overlayElapsed:   number = -1;
  private _shapeAnimElapsed: number = -1;

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  @subscribe(OnEntityCreateEvent)
  onCreate(): void {
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi != null) {
      customUi.dataContext = this._shapeIntruderDisplayVM;
      console.log('[ShapeIntruderDisplay] dataContext set');
    }
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    const dt = payload.deltaTime;
    this._tickOverlay(dt);
    this._tickShapeAnim(dt);
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  @subscribe(Events.GameStarted)
  onGameStarted(_p: Events.GameStartedPayload): void {
    this._score = 0;
    this._shapeIntruderDisplayVM.scoreText    = '0';
    this._shapeIntruderDisplayVM.timerProgress = 1;
  }

  @subscribe(Events.RoundStarted)
  onRoundStarted(payload: Events.RoundStartedPayload): void {
    this._resetFeedbackState();
    this._shapes         = payload.shapes;
    this._currentOptions = payload.options;
    this._updateShapesViewModel();
    this._updateOptionsViewModel(payload);
  }

  @subscribe(Events.TimerTick)
  onTimerTick(payload: Events.TimerTickPayload): void {
    this._shapeIntruderDisplayVM.timerProgress = payload.pct;
  }

  @subscribe(Events.AnswerResult)
  onAnswerResult(payload: Events.AnswerResultPayload): void {
    const vm = this._shapeIntruderDisplayVM;
    this._score   = payload.newScore;
    vm.scoreText  = String(this._score);

    if (payload.timeout) {
      vm.overlayColor = WRONG_OVERLAY;
      this._startOverlay();
    } else if (payload.correct) {
      this._setButtonColors(payload.correctIndex, CORRECT_BTN_BG, CORRECT_BTN_BORDER);
      vm.overlayColor = CORRECT_OVERLAY;
      this._startOverlay();
    } else {
      if (payload.wrongIndex >= 0 && payload.wrongIndex <= 3) {
        this._setButtonColors(payload.wrongIndex, WRONG_BTN_BG, WRONG_BTN_BORDER);
        this._startShapeAnim(payload.wrongIndex);
      }
      vm.overlayColor = WRONG_OVERLAY;
      this._startOverlay();
    }
  }

  @subscribe(onAnswerOptionPressed)
  onAnswerOptionPressed(payload: ShapeAnswerOptionPayload): void {
    const optionIndex = parseInt(payload.parameter, 10);
    if (isNaN(optionIndex) || optionIndex < 0 || optionIndex > 3) return;
    EventService.sendLocally(Events.AnswerSubmitted, { optionIndex });
  }

  // ─── Animation ticks ──────────────────────────────────────────────────────

  private _tickOverlay(dt: number): void {
    if (this._overlayElapsed < 0) return;
    this._overlayElapsed += dt;
    const pct = Math.min(this._overlayElapsed / OVERLAY_DURATION_SEC, 1);
    this._shapeIntruderDisplayVM.overlayOpacity = pct * OVERLAY_TARGET_OPACITY;
    if (pct >= 1) this._overlayElapsed = -1;
  }

  private _tickShapeAnim(dt: number): void {
    if (this._shapeAnimElapsed < 0) return;
    this._shapeAnimElapsed += dt;

    const shapeVMs     = this._shapeIntruderDisplayVM.shapes;
    const totalDuration = Math.max(WRONG_FADE_DURATION_SEC, WRONG_PULSE_DURATION_SEC);

    if (this._shapeAnimElapsed >= totalDuration) {
      for (const idx of this._nonMatchingIndices) {
        if (idx < shapeVMs.length) shapeVMs[idx].opacity = WRONG_FADE_TARGET;
      }
      for (const idx of this._matchingIndices) {
        if (idx < shapeVMs.length) shapeVMs[idx].scale = this._originalScales[idx];
      }
      this._shapeAnimElapsed = -1;
      return;
    }

    // Fade non-matching shapes: opacity 1 → WRONG_FADE_TARGET
    const fadePct = Math.min(this._shapeAnimElapsed / WRONG_FADE_DURATION_SEC, 1);
    const opacity = 1 - fadePct * (1 - WRONG_FADE_TARGET);
    for (const idx of this._nonMatchingIndices) {
      if (idx < shapeVMs.length) shapeVMs[idx].opacity = opacity;
    }

    // Pulse matching shapes: half-sine scale (1 → PEAK → 1)
    const pulsePct  = Math.min(this._shapeAnimElapsed / WRONG_PULSE_DURATION_SEC, 1);
    const scaleMult = 1 + (WRONG_PULSE_PEAK - 1) * Math.sin(pulsePct * Math.PI);
    for (const idx of this._matchingIndices) {
      if (idx < shapeVMs.length) shapeVMs[idx].scale = this._originalScales[idx] * scaleMult;
    }
  }

  // ─── Animation starters ───────────────────────────────────────────────────

  private _startOverlay(): void {
    this._shapeIntruderDisplayVM.overlayOpacity = 0;
    this._overlayElapsed = 0;
  }

  private _startShapeAnim(wrongIndex: number): void {
    const wrongOption = this._currentOptions[wrongIndex];
    if (!wrongOption) return;
    const shapeVMs = this._shapeIntruderDisplayVM.shapes;
    if (shapeVMs.length === 0) return;

    this._originalScales    = shapeVMs.map(s => s.scale);
    this._matchingIndices    = [];
    this._nonMatchingIndices = [];

    for (let i = 0; i < this._shapes.length; i++) {
      const s = this._shapes[i];
      if (s.typeKey === wrongOption.typeKey && s.colorKey === wrongOption.colorKey) {
        this._matchingIndices.push(i);
      } else {
        this._nonMatchingIndices.push(i);
      }
    }
    this._shapeAnimElapsed = 0;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private _resetFeedbackState(): void {
    this._overlayElapsed   = -1;
    this._shapeAnimElapsed = -1;

    const vm = this._shapeIntruderDisplayVM;
    vm.option0BgColor     = BTN_BG_COLORS[0];
    vm.option1BgColor     = BTN_BG_COLORS[1];
    vm.option2BgColor     = BTN_BG_COLORS[2];
    vm.option3BgColor     = BTN_BG_COLORS[3];
    vm.option0BorderColor = BTN_BORDER_COLORS[0];
    vm.option1BorderColor = BTN_BORDER_COLORS[1];
    vm.option2BorderColor = BTN_BORDER_COLORS[2];
    vm.option3BorderColor = BTN_BORDER_COLORS[3];
    vm.overlayOpacity     = 0;
    vm.timerProgress      = 1;

    for (let i = 0; i < vm.shapes.length; i++) {
      vm.shapes[i].opacity = 1;
      if (i < this._originalScales.length) vm.shapes[i].scale = this._originalScales[i];
    }
    this._originalScales    = [];
    this._matchingIndices    = [];
    this._nonMatchingIndices = [];
  }

  private _updateShapesViewModel(): void {
    if (DEBUG_GRID_TEST) {
      this._shapeIntruderDisplayVM.shapes = this._buildDebugGrid();
      this._shapeIntruderDisplayVM.shapeCount = this._shapeIntruderDisplayVM.shapes.length;
      return;
    }
    this._shapeIntruderDisplayVM.shapes = this._shapes.map(s => {
      const item      = new ShapeItemViewModel();
      item.x          = s.x * ZONE_SIZE;
      item.y          = s.y * ZONE_SIZE;
      item.scale      = s.size *ZONE_SIZE/2;
      item.rotation   = s.rotation * (180 / Math.PI);
      item.fillColor  = COLOR_DEFS[s.colorKey as ColorKey]?.hex ?? '#FFFFFF';
      item.spriteTexture = SHAPE_TEXTURE_MAP[s.typeKey as string] ?? null;
      return item;
    });
    this._shapeIntruderDisplayVM.shapeCount = this._shapes.length;
  }

  private _buildDebugGrid(): ShapeItemViewModel[] {
    const COLS       = 5;
    const ROWS       = 5;
    const cellSize   = ZONE_SIZE / COLS;  // 90px per cell
    const shapeKeys  = Object.keys(SHAPE_TEXTURE_MAP);
    const colorKeys  = Object.keys(COLOR_DEFS) as ColorKey[];
    const items: ShapeItemViewModel[] = [];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const item = new ShapeItemViewModel();
        // Center of each cell
        item.x          = col * cellSize;
        item.y          = row * cellSize;
        // scale = half cell size so the 2×2 unit sprite fills the cell exactly
        item.scale      = cellSize / 2;
        item.rotation   = 0;
        item.fillColor  = COLOR_DEFS[colorKeys[(row * COLS + col) % colorKeys.length]].hex;
        item.spriteTexture = SHAPE_TEXTURE_MAP[shapeKeys[(col) % shapeKeys.length]] ?? null;
        item.opacity    = 1;
        items.push(item);
      }
    }
    return items;
  }

  private _updateOptionsViewModel(payload: Events.RoundStartedPayload): void {
    const vm = this._shapeIntruderDisplayVM;
    for (let i = 0; i < payload.options.length && i < 4; i++) {
      const opt       = payload.options[i];
      const fillColor = COLOR_DEFS[opt.colorKey as ColorKey]?.hex ?? '#FFFFFF';
      const texture   = SHAPE_TEXTURE_MAP[opt.typeKey as string] ?? null;

      switch (i) {
        case 0: vm.option0FillColor = fillColor; vm.option0SpriteTexture = texture; break;
        case 1: vm.option1FillColor = fillColor; vm.option1SpriteTexture = texture; break;
        case 2: vm.option2FillColor = fillColor; vm.option2SpriteTexture = texture; break;
        case 3: vm.option3FillColor = fillColor; vm.option3SpriteTexture = texture; break;
      }
    }


  }

  private _setButtonColors(index: number, bg: string, border: string): void {
    const vm = this._shapeIntruderDisplayVM;
    switch (index) {
      case 0: vm.option0BgColor = bg; vm.option0BorderColor = border; break;
      case 1: vm.option1BgColor = bg; vm.option1BorderColor = border; break;
      case 2: vm.option2BgColor = bg; vm.option2BorderColor = border; break;
      case 3: vm.option3BgColor = bg; vm.option3BorderColor = border; break;
    }
  }
}
