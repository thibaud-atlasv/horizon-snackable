import { uiViewModel, UiViewModel, UiEvent, serializable } from 'meta/worlds';

export const DEFAULT_BTN_BG     = '#1e1e2e';
export const DEFAULT_BTN_BORDER = '#1e1e2e';

@uiViewModel()
export class ShapeItemViewModel extends UiViewModel {
  public x:         number = 0;
  public y:         number = 0;
  public scale:     number = 1;
  public rotation:  number = 0;
  public fillColor: string = '#FFFFFF';
  public pathData:  string = '';
  public pathVisible: boolean = true;
  public opacity:   number = 1;
}

// ─── UiEvent for answer option button presses ────────────────────────────────

@serializable()
export class ShapeAnswerOptionPayload {
  readonly parameter: string = '';
}

export const onAnswerOptionPressed = new UiEvent(
  'onShapeIntruderAnswerOptionPressed',
  ShapeAnswerOptionPayload,
);

// ─── Main ViewModel ───────────────────────────────────────────────────────────

@uiViewModel()
export class ShapeIntruderDisplayViewModel extends UiViewModel {
  public shapes:     readonly ShapeItemViewModel[] = [];
  public shapeCount: number                        = 0;

  public option0: ShapeItemViewModel = new ShapeItemViewModel();
  public option1: ShapeItemViewModel = new ShapeItemViewModel();
  public option2: ShapeItemViewModel = new ShapeItemViewModel();
  public option3: ShapeItemViewModel = new ShapeItemViewModel();

  // Per-button background & border colors for feedback
  public option0BgColor:     string = DEFAULT_BTN_BG;
  public option1BgColor:     string = DEFAULT_BTN_BG;
  public option2BgColor:     string = DEFAULT_BTN_BG;
  public option3BgColor:     string = DEFAULT_BTN_BG;
  public option0BorderColor: string = DEFAULT_BTN_BORDER;
  public option1BorderColor: string = DEFAULT_BTN_BORDER;
  public option2BorderColor: string = DEFAULT_BTN_BORDER;
  public option3BorderColor: string = DEFAULT_BTN_BORDER;

  // HUD: score counter and timer bar
  public scoreText:      string = '0';
  public timerProgress:  number = 1;   // 1 = full bar, 0 = empty

  // Full-canvas overlay for correct/incorrect flash
  public overlayColor:   string = '#22c55e';
  public overlayOpacity: number = 0;

  override readonly events = { onAnswerOptionPressed };
}
