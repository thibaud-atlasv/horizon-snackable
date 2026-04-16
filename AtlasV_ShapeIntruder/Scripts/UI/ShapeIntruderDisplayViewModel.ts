import { uiViewModel, UiViewModel, UiEvent, serializable, TextureAsset } from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

// Fixed background colors per button position (never change between rounds)
export const BTN_BG_COLORS     = ['#00000000', '#00000000', '#00000000', '#00000000'] as const;
export const BTN_BORDER_COLORS = ['#a855f7', '#3b82f6', '#22c55e', '#ea580c'] as const;

// Feedback colors
export const BTN_CORRECT_BG     = '#bbf7d0';
export const BTN_CORRECT_BORDER = '#22c55e';
export const BTN_WRONG_BG       = '#fecaca';
export const BTN_WRONG_BORDER   = '#ef4444';

@uiViewModel()
export class ShapeItemViewModel extends UiViewModel {
  public x:         number = 0;
  public y:         number = 0;
  public scale:     number = 1;
  public rotation:  number = 0;
  public fillColor: string = '#FFFFFF';
  public opacity:   number = 1;
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

  // Flat option fill color for XAML (avoids nested ViewModel path bindings)
  public option0FillColor:    string = '#ef4444';
  public option1FillColor:    string = '#3b82f6';
  public option2FillColor:    string = '#22c55e';
  public option3FillColor:    string = '#a855f7';

  // TextureAsset bindings for dynamic 3-layer shape display in XAML
  public option0SpriteTexture: Maybe<TextureAsset> = null;
  public option1SpriteTexture: Maybe<TextureAsset> = null;
  public option2SpriteTexture: Maybe<TextureAsset> = null;
  public option3SpriteTexture: Maybe<TextureAsset> = null;

  // HUD: score counter and timer bar
  public scoreText:      string = '0';
  public timerProgress:  number = 1;   // 1 = full bar, 0 = empty

  // Full-canvas overlay for correct/incorrect flash
  public overlayColor:   string = '#22c55e';
  public overlayOpacity: number = 0;

  override readonly events = { onAnswerOptionPressed };
}
