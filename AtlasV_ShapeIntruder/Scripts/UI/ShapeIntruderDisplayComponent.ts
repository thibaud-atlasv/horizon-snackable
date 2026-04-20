import {
  Component, component,
  subscribe,
  CustomUiComponent,
  OnEntityCreateEvent,
  OnWorldUpdateEvent, ExecuteOn,
  EventService,
  HapticsService, HapticLocation,
} from 'meta/worlds';
import type { HapticClip } from 'meta/worlds';
import { ConfettiExplosionTriggerEvent, ConfettiExplosionTriggerPayload, ConfettiExplosionFadeOutEvent, ConfettiExplosionFadeOutPayload } from './ConfettiExplosionUIComponent';
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

import {
  ZONE_SIZE,
  CORRECT_BTN_BG, CORRECT_BTN_BORDER,
  WRONG_BTN_BG, WRONG_BTN_BORDER, WRONG_OVERLAY,
  OVERLAY_TARGET_OPACITY, OVERLAY_DURATION_SEC,
  WRONG_FADE_DURATION_SEC, WRONG_FADE_TARGET,
  WRONG_PULSE_DURATION_SEC, WRONG_PULSE_PEAK,
  DEBUG_GRID_TEST,
} from '../Constants';
import { SHAPE_TEXTURE_MAP } from '../Assets';

const CORRECT_BLINK_OPACITY  = 0.35;
const CORRECT_BLINK_DURATION = 0.25; // seconds for full blink (up + down)

const FEEDBACK_ICON_DURATION = 0.8;  // total display time in seconds
const FEEDBACK_POP_DURATION  = 0.25; // pop-in phase duration
const FEEDBACK_SETTLE_FRAC   = 1.5;  // settle phase ends at POP_DURATION * this

const SCORE_POPUP_DURATION   = 0.8;  // seconds for float-up + fade
const SCORE_POPUP_FLOAT_PX   = -50;  // negative = upward in XAML space

const BTN_TAP_HAPTIC: HapticClip = {
  amplitudeEnvelope: [
    { timeMs: 0,   value: 0.0 },
    { timeMs: 10,  value: 1.0 },
    { timeMs: 80,  value: 0.0 },
  ],
  frequencyEnvelope: [
    { timeMs: 0,  value: 0.8 },
    { timeMs: 80, value: 0.3 },
  ],
};

@component()
export class ShapeIntruderDisplayComponent extends Component {
  private _shapeIntruderDisplayVM = new ShapeIntruderDisplayViewModel();
  private _shapes: IShapeInstance[] = [];
  private _currentOptions: IOption[] = [];
  private _originalScales: number[] = [];
  private _matchingIndices: number[] = [];
  private _nonMatchingIndices: number[] = [];
  private _score: number = 0;

  // Track which button was last pressed for feedback icons
  private _lastPressedIndex: number = -1;

  // Casino rolling score animation
  private _scoreAnimElapsed: number = -1;  // -1 = inactive
  private _scoreAnimFrom: number = 0;
  private _scoreAnimTo: number = 0;
  private _scoreAnimDuration: number = 0.5; // 500ms

  // Score popup animation
  private _scorePopupElapsed: number = -1;

  // Per-shape float parameters: [baseRotation (deg), amplitude (deg), frequency (Hz), phase (rad)]
  private _floatParams: Array<[number, number, number, number]> = [];
  private _floatTime: number = 0;

  // Animation elapsed time in seconds; -1 = inactive
  private _overlayElapsed:   number = -1;
  private _blinkElapsed:     number = -1;
  private _shapeAnimElapsed: number = -1;
  private _feedbackIconElapsed: number = -1;

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  @subscribe(OnEntityCreateEvent)
  onCreate(): void {
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi != null) customUi.dataContext = this._shapeIntruderDisplayVM;
    this._preloadTextures();
  }

  /**
   * Populate the shapes array with invisible entries (opacity=0) so XAML
   * creates Image elements and fetches every texture before gameplay begins.
   * The array is fully replaced on the first RoundStarted event.
   */
  private _preloadTextures(): void {
    const keys = Object.keys(SHAPE_TEXTURE_MAP);
    const preloadItems: ShapeItemViewModel[] = keys.map(key => {
      const item = new ShapeItemViewModel();
      item.opacity = 0;        // invisible — but XAML still loads the texture
      item.scale = 1;          // non-zero so the element isn't skipped
      item.x = 0;
      item.y = 0;
      item.spriteTexture = SHAPE_TEXTURE_MAP[key] ?? null;
      return item;
    });
    this._shapeIntruderDisplayVM.shapes = preloadItems;
    this._shapeIntruderDisplayVM.shapeCount = preloadItems.length;
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    const dt = payload.deltaTime;
    this._tickRotation(dt);
    this._tickOverlay(dt);
    this._tickBlink(dt);
    this._tickShapeAnim(dt);
    this._tickFeedbackIcon(dt);
    this._tickScorePopup(dt);
    this._tickScoreAnim(dt);
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  @subscribe(Events.GameStarted)
  onGameStarted(_p: Events.GameStartedPayload): void {
    this._score = 0;
    this._scoreAnimElapsed = -1;
    this._scoreAnimFrom = 0;
    this._scoreAnimTo = 0;
    this._shapeIntruderDisplayVM.scoreText    = '0';
    this._shapeIntruderDisplayVM.timerProgress = 1;
  }

  @subscribe(Events.RoundStarted)
  onRoundStarted(payload: Events.RoundStartedPayload): void {
    EventService.sendLocally(ConfettiExplosionFadeOutEvent, new ConfettiExplosionFadeOutPayload());
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
    // Start casino rolling animation from old score to new score
    this._scoreAnimFrom = this._score;
    this._scoreAnimTo   = payload.newScore;
    this._scoreAnimElapsed = 0;
    this._score   = payload.newScore;

    // Trigger floating score popup when points earned
    if (payload.pointsEarned > 0) {
      vm.scorePopupText    = `+${payload.pointsEarned}`;
      vm.scorePopupOpacity = 1;
      vm.scorePopupOffsetY = 0;
      vm.scorePopupVisible = true;
      this._scorePopupElapsed = 0;
    }

    if (payload.timeout) {
      // Timeout: show correct answer checkmark
      this._setButtonCheck(payload.correctIndex, true);
      vm.overlayColor = WRONG_OVERLAY;
      this._startOverlay();
      this._showFeedbackIcon('Textures/Invalid.png');
    } else if (payload.correct) {
      // Correct: pressed button gets press effect + checkmark
      if (this._lastPressedIndex >= 0) {
        this._setButtonOffsetY(this._lastPressedIndex, 3);
        this._setButtonCheck(this._lastPressedIndex, true);
      }
      this._startBlink();
      this._showFeedbackIcon('Textures/Valid.png');
      const confettiPayload = new ConfettiExplosionTriggerPayload();
      EventService.sendLocally(ConfettiExplosionTriggerEvent, confettiPayload);
    } else {
      // Wrong: pressed button gets press effect + cross, correct button gets checkmark
      if (this._lastPressedIndex >= 0) {
        this._setButtonOffsetY(this._lastPressedIndex, 3);
        this._setButtonCross(this._lastPressedIndex, true);
      }
      this._setButtonCheck(payload.correctIndex, true);
      this._showFeedbackIcon('Textures/Invalid.png');

      if (payload.wrongIndex >= 0 && payload.wrongIndex <= 3) {
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
    this._lastPressedIndex = optionIndex;
    HapticsService.get().playOneShot(HapticLocation.BothHands, BTN_TAP_HAPTIC);
    EventService.sendLocally(Events.AnswerSubmitted, { optionIndex });
  }

  // ─── Animation ticks ──────────────────────────────────────────────────────

  private _tickRotation(dt: number): void {
    this._floatTime += dt;
    const shapes = this._shapeIntruderDisplayVM.shapes;
    for (let i = 0; i < shapes.length && i < this._floatParams.length; i++) {
      const [base, amp, freq, phase] = this._floatParams[i];
      shapes[i].rotation = base + amp * Math.sin(2 * Math.PI * freq * this._floatTime + phase);
    }
  }

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
        if (idx < shapeVMs.length) shapeVMs[idx].scale = this._originalScales[idx] * WRONG_PULSE_PEAK;
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

    // Scale up matching shapes: linear 1 → WRONG_PULSE_PEAK (stays at peak)
    const pulsePct  = Math.min(this._shapeAnimElapsed / WRONG_PULSE_DURATION_SEC, 1);
    const scaleMult = 1 + (WRONG_PULSE_PEAK - 1) * pulsePct;
    for (const idx of this._matchingIndices) {
      if (idx < shapeVMs.length) shapeVMs[idx].scale = this._originalScales[idx] * scaleMult;
    }
  }

  // ─── Animation starters ───────────────────────────────────────────────────

  private _tickScoreAnim(dt: number): void {
    if (this._scoreAnimElapsed < 0) return;
    this._scoreAnimElapsed += dt;
    const t = Math.min(this._scoreAnimElapsed / this._scoreAnimDuration, 1);
    // Quadratic ease-out: 1 - (1 - t)^2
    const eased = 1 - (1 - t) * (1 - t);
    const displayedValue = Math.round(
      this._scoreAnimFrom + (this._scoreAnimTo - this._scoreAnimFrom) * eased,
    );
    this._shapeIntruderDisplayVM.scoreText = String(displayedValue);
    if (t >= 1) {
      this._scoreAnimElapsed = -1;
    }
  }

  private _tickBlink(dt: number): void {
    if (this._blinkElapsed < 0) return;
    this._blinkElapsed += dt;
    const pct = Math.min(this._blinkElapsed / CORRECT_BLINK_DURATION, 1);
    // triangle curve: up first half, down second half
    const tri = pct < 0.5 ? pct * 2 : (1 - pct) * 2;
    this._shapeIntruderDisplayVM.overlayOpacity = tri * CORRECT_BLINK_OPACITY;
    if (pct >= 1) {
      this._shapeIntruderDisplayVM.overlayOpacity = 0;
      this._blinkElapsed = -1;
    }
  }

  private _startBlink(): void { /* intentionally disabled */ }

  private _startOverlay(): void { /* intentionally disabled */ }

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
      if (s.typeKey === wrongOption.typeKey) {
        this._matchingIndices.push(i);
      } else {
        this._nonMatchingIndices.push(i);
      }
    }
    this._shapeAnimElapsed = 0;
  }

  // ─── Feedback icon animation ────────────────────────────────────────

  private _showFeedbackIcon(source: string): void {
    const vm = this._shapeIntruderDisplayVM;
    const isValid = source.indexOf('Valid') >= 0;
    vm.feedbackValidVisible   = isValid;
    vm.feedbackInvalidVisible = !isValid;
    vm.feedbackIconScale      = 0;
    this._feedbackIconElapsed = 0;
  }

  private _tickFeedbackIcon(dt: number): void {
    if (this._feedbackIconElapsed < 0) return;
    this._feedbackIconElapsed += dt;
    const vm = this._shapeIntruderDisplayVM;

    const popEnd    = FEEDBACK_POP_DURATION;
    const settleEnd = FEEDBACK_POP_DURATION * FEEDBACK_SETTLE_FRAC;

    if (this._feedbackIconElapsed >= FEEDBACK_ICON_DURATION) {
      // Done — hide icon
      vm.feedbackValidVisible   = false;
      vm.feedbackInvalidVisible = false;
      vm.feedbackIconScale      = 0;
      this._feedbackIconElapsed = -1;
      return;
    }

    if (this._feedbackIconElapsed < popEnd) {
      // Phase 1: scale 0 → 1.2 (ease-out)
      const t = this._feedbackIconElapsed / popEnd;
      const eased = 1 - (1 - t) * (1 - t); // quadratic ease-out
      vm.feedbackIconScale = eased * 1.2;
    } else if (this._feedbackIconElapsed < settleEnd) {
      // Phase 2: scale 1.2 → 1.0 (settle)
      const t = (this._feedbackIconElapsed - popEnd) / (settleEnd - popEnd);
      vm.feedbackIconScale = 1.2 - 0.2 * t;
    } else {
      // Phase 3: hold at 1.0 until duration ends
      vm.feedbackIconScale = 1.0;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private _tickScorePopup(dt: number): void {
    if (this._scorePopupElapsed < 0) return;
    this._scorePopupElapsed += dt;
    const vm = this._shapeIntruderDisplayVM;
    const t = Math.min(this._scorePopupElapsed / SCORE_POPUP_DURATION, 1);
    // Ease-out for both offset and opacity
    const eased = 1 - (1 - t) * (1 - t);
    vm.scorePopupOffsetY = eased * SCORE_POPUP_FLOAT_PX;
    vm.scorePopupOpacity = 1 - eased;
    if (t >= 1) {
      vm.scorePopupVisible = false;
      vm.scorePopupOpacity = 0;
      vm.scorePopupOffsetY = 0;
      this._scorePopupElapsed = -1;
    }
  }

  private _resetFeedbackState(): void {
    this._overlayElapsed   = -1;
    this._shapeAnimElapsed = -1;
    this._lastPressedIndex = -1;
    this._feedbackIconElapsed = -1;
    this._scoreAnimElapsed = -1;
    this._scorePopupElapsed = -1;

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

    // Reset feedback icon
    vm.feedbackValidVisible   = false;
    vm.feedbackInvalidVisible = false;
    vm.feedbackIconScale      = 0;

    // Reset score popup
    vm.scorePopupVisible  = false;
    vm.scorePopupOpacity  = 0;
    vm.scorePopupOffsetY  = 0;
    vm.scorePopupText     = '';

    // Reset button 3D effects
    vm.option0OffsetY = 0; vm.option1OffsetY = 0;
    vm.option2OffsetY = 0; vm.option3OffsetY = 0;
    vm.option0CheckVisible = false; vm.option1CheckVisible = false;
    vm.option2CheckVisible = false; vm.option3CheckVisible = false;
    vm.option0CrossVisible = false; vm.option1CrossVisible = false;
    vm.option2CrossVisible = false; vm.option3CrossVisible = false;

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
    this._floatTime = 0;
    this._floatParams = this._shapes.map(s => {
      const base  = s.rotation * (180 / Math.PI);
      const amp   = 8 + Math.random() * 10;         // ±8–18°
      const freq  = 0.02 + Math.random() * 0.05;      // 0.2–0.4 Hz (~3–5s cycle)
      const phase = Math.random() * 2 * Math.PI;    // desync entre shapes
      return [base, amp, freq, phase] as [number, number, number, number];
    });
    this._shapeIntruderDisplayVM.shapes = this._shapes.map(s => {
      const item         = new ShapeItemViewModel();
      item.x             = s.x * ZONE_SIZE;
      item.y             = s.y * ZONE_SIZE;
      item.scale         = s.size * ZONE_SIZE / 2;
      item.rotation      = s.rotation * (180 / Math.PI);
      item.spriteTexture = SHAPE_TEXTURE_MAP[s.typeKey] ?? null;
      return item;
    });
    this._shapeIntruderDisplayVM.shapeCount = this._shapes.length;
  }

  private _buildDebugGrid(): ShapeItemViewModel[] {
    const shapeKeys = Object.keys(SHAPE_TEXTURE_MAP);
    const count     = shapeKeys.length;
    const COLS      = Math.ceil(Math.sqrt(count));
    const ROWS      = Math.ceil(count / COLS);
    const cellSize  = ZONE_SIZE / COLS;
    const items: ShapeItemViewModel[] = [];

    for (let i = 0; i < count; i++) {
      const item         = new ShapeItemViewModel();
      item.x             = (i % COLS) * cellSize;
      item.y             = Math.floor(i / COLS) * cellSize;
      item.scale         = cellSize / 2;
      item.rotation      = 0;
      item.spriteTexture = SHAPE_TEXTURE_MAP[shapeKeys[i]] ?? null;
      item.opacity       = 1;
      items.push(item);
    }
    console.log(`[DebugGrid] ${count} sprites, ${COLS}×${ROWS} grid, cell=${cellSize.toFixed(1)}px`);
    return items;
  }

  private _updateOptionsViewModel(payload: Events.RoundStartedPayload): void {
    const vm = this._shapeIntruderDisplayVM;
    const keys = payload.options.map(o => o.typeKey);
    console.log(`[Round ${payload.round}] options: [${keys.join(', ')}] correct=${keys[payload.correctIndex]}`);
    for (let i = 0; i < payload.options.length && i < 4; i++) {
      const texture = SHAPE_TEXTURE_MAP[payload.options[i].typeKey] ?? null;
      switch (i) {
        case 0: vm.option0SpriteTexture = texture; break;
        case 1: vm.option1SpriteTexture = texture; break;
        case 2: vm.option2SpriteTexture = texture; break;
        case 3: vm.option3SpriteTexture = texture; break;
      }
    }
  }
  private _setButtonOffsetY(index: number, y: number): void {
    const vm = this._shapeIntruderDisplayVM;
    switch (index) {
      case 0: vm.option0OffsetY = y; break;
      case 1: vm.option1OffsetY = y; break;
      case 2: vm.option2OffsetY = y; break;
      case 3: vm.option3OffsetY = y; break;
    }
  }

  private _setButtonCheck(index: number, visible: boolean): void {
    const vm = this._shapeIntruderDisplayVM;
    switch (index) {
      case 0: vm.option0CheckVisible = visible; break;
      case 1: vm.option1CheckVisible = visible; break;
      case 2: vm.option2CheckVisible = visible; break;
      case 3: vm.option3CheckVisible = visible; break;
    }
  }

  private _setButtonCross(index: number, visible: boolean): void {
    const vm = this._shapeIntruderDisplayVM;
    switch (index) {
      case 0: vm.option0CrossVisible = visible; break;
      case 1: vm.option1CrossVisible = visible; break;
      case 2: vm.option2CrossVisible = visible; break;
      case 3: vm.option3CrossVisible = visible; break;
    }
  }
}
