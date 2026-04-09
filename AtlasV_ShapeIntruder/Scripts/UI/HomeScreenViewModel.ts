import { uiViewModel, UiViewModel, UiEvent } from 'meta/worlds';

// ─── UiEvent for "Tap to start" button ────────────────────────────────────────
export const onHomeScreenTapToStart = new UiEvent('onHomeScreenTapToStart');

// ─── ViewModel ────────────────────────────────────────────────────────────────
@uiViewModel()
export class ShapeIntruderHomeScreenViewModel extends UiViewModel {
  public isHomeVisible: boolean = true;

  override readonly events = {
    onHomeScreenTapToStart,
  };
}

