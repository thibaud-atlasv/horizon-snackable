import { uiViewModel, UiViewModel, UiEvent, serializable, TextureAsset } from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

// Fixed background colors per button position (never change between rounds)
export const BTN_BG_COLORS     = ['#e8c7ff', '#55edfb', '#bbee39', '#ffdb3f'] as const;
export const BTN_BORDER_COLORS = ['#ce8cf9', '#1aa3f1', '#74d702', '#ff9b3d'] as const;

// Feedback colors
export const BTN_CORRECT_BG     = '#bbf7d0';
export const BTN_CORRECT_BORDER = '#22c55e';
export const BTN_WRONG_BG       = '#fecaca';
export const BTN_WRONG_BORDER   = '#ef4444';

@uiViewModel()
export class ShapeItemViewModel extends UiViewModel {
  public x:        number = 0;
  public y:        number = 0;
  public scale:    number = 1;
  public rotation: number = 0;
  public opacity:  number = 1;
  public spriteTexture: Maybe<TextureAsset> = null;
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
  public option0BgColor:     string = BTN_BG_COLORS[0];
  public option1BgColor:     string = BTN_BG_COLORS[1];
  public option2BgColor:     string = BTN_BG_COLORS[2];
  public option3BgColor:     string = BTN_BG_COLORS[3];
  public option0BorderColor: string = BTN_BORDER_COLORS[0];
  public option1BorderColor: string = BTN_BORDER_COLORS[1];
  public option2BorderColor: string = BTN_BORDER_COLORS[2];
  public option3BorderColor: string = BTN_BORDER_COLORS[3];

  // TextureAsset bindings for dynamic shape display in XAML
  public option0SpriteTexture: Maybe<TextureAsset> = null;
  public option1SpriteTexture: Maybe<TextureAsset> = null;
  public option2SpriteTexture: Maybe<TextureAsset> = null;
  public option3SpriteTexture: Maybe<TextureAsset> = null;

  // Per-button Y offset for pressed effect (0 = normal, 3 = pressed down)
  public option0OffsetY: number = 0;
  public option1OffsetY: number = 0;
  public option2OffsetY: number = 0;
  public option3OffsetY: number = 0;

  // Per-button validation icon visibility
  public option0CheckVisible: boolean = false;
  public option1CheckVisible: boolean = false;
  public option2CheckVisible: boolean = false;
  public option3CheckVisible: boolean = false;

  public option0CrossVisible: boolean = false;
  public option1CrossVisible: boolean = false;
  public option2CrossVisible: boolean = false;
  public option3CrossVisible: boolean = false;

  // HUD: score counter and timer bar
  public scoreText:      string = '0';
  public timerProgress:  number = 1;   // 1 = full bar, 0 = empty

  // Full-canvas overlay for correct/incorrect flash
  public overlayColor:   string = '#22c55e';
  public overlayOpacity: number = 0;

  // Centered feedback icon (correct/wrong) with pop animation
  public feedbackValidVisible:   boolean = false;
  public feedbackInvalidVisible: boolean = false;
  public feedbackIconScale:      number  = 0;

  // Score popup (floating "+XXX" after scoring)
  public scorePopupText:     string  = '';
  public scorePopupOpacity:  number  = 0;
  public scorePopupOffsetY:  number  = 0;
  public scorePopupVisible:  boolean = false;

  override readonly events = { onAnswerOptionPressed };
}
