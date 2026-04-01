/**
 * TapButtonUIComponent — Handles the main tap button UI for the idle clicker.
 *
 * Component Attachment: Scene Entity with CustomUiComponent
 * Component Networking: Local (client-only UI)
 * Component Ownership: N/A (local entity)
 *
 * Responsibilities:
 *   - Bind ViewModel to CustomUiComponent for XAML button display
 *   - Subscribe to UI button click event
 *   - Fire Events.PlayerTap on click (same as touch input)
 *
 * Note: All visual animations (press scale, bounce, glow) are handled in XAML
 *       via Storyboard animations triggered on Button.Click event.
 *
 * ── Does NOT own ──────────────────────────────────────────────────────────────
 *   - Tap logic → TapService (processes Events.PlayerTap)
 *   - Resources → ResourceService
 *
 * ── Scene setup ───────────────────────────────────────────────────────────────
 *   Attach this component to an entity with a CustomUiComponent.
 *   The XAML should contain a Button that fires 'TapButtonClickEvent'.
 */
import {
  Component, OnEntityStartEvent,
  NetworkingService, EventService,
  CustomUiComponent,
  UiEvent, UiViewModel, uiViewModel,
  component, subscribe,
} from 'meta/worlds';
import { Events } from '../Types';

// ─── UiEvent ──────────────────────────────────────────────────────────────────
const tapButtonClickEvent = new UiEvent('TapButtonClickEvent');

// ─── ViewModel ────────────────────────────────────────────────────────────────
@uiViewModel()
class TapButtonViewModel extends UiViewModel {
  /** Button label text (can be customized). */
  ButtonLabel: string = 'TAP!';

  /**
   * Toggle this to trigger the tap animation from code.
   * XAML DataTrigger watches for changes to play the storyboard.
   */
  TriggerAnimation: boolean = false;

  /** Expose the click event for XAML binding. */
  override readonly events = {
    buttonClick: tapButtonClickEvent,
  };
}

@component()
export class TapButtonUIComponent extends Component {

  // ─── Internal state ─────────────────────────────────────────────────────────
  private _viewModel = new TapButtonViewModel();

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    // UI is client-only
    if (NetworkingService.get().isServerContext()) return;

    // Bind ViewModel to the CustomUiComponent
    const ui = this.entity.getComponent(CustomUiComponent);
    if (ui) {
      ui.dataContext = this._viewModel;
    }
  }

  // ─── UI Event Handler ───────────────────────────────────────────────────────

  @subscribe(tapButtonClickEvent)
  onButtonClick(): void {
    EventService.sendLocally(Events.PlayerTap, {});
  }

  // ───────────────────────────────────────────────────────────── External Animation Trigger ───

  @subscribe(Events.PlayerTap)
  playerTap(): void {
    // Toggle the property to trigger XAML DataTrigger animation
    this._viewModel.TriggerAnimation = !this._viewModel.TriggerAnimation;
  }
  /**
   * Subscribe to external animation trigger event (e.g. from auto-clicker).
   * Toggles ViewModel.TriggerAnimation to play the XAML storyboard.
   */
  @subscribe(Events.PlayTapAnimation)
  onPlayTapAnimation(): void {
    // Toggle the property to trigger XAML DataTrigger animation
    this._viewModel.TriggerAnimation = !this._viewModel.TriggerAnimation;
  }
}
