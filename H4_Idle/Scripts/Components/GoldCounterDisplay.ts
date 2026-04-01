/**
 * GoldCounterDisplay — Displays the current gold amount at the top of the screen.
 *
 * Component Attachment: Scene Entity with CustomUiComponent
 * Component Networking: Local (client-only UI)
 * Component Ownership: N/A (local entity)
 *
 * Responsibilities:
 *   - Bind ViewModel to CustomUiComponent for XAML display
 *   - Subscribe to Events.ResourceChanged to update gold display in real-time
 *   - Format gold amount with commas for readability
 *   - Expose isVisible property to control UI visibility from the editor
 *
 * ── Does NOT own ────────────────────────────────────────────────────────
 *   - Gold state → ResourceService (fires Events.ResourceChanged)
 *
 * ── Scene setup ─────────────────────────────────────────────────────────
 *   Attach this component to an entity with a CustomUiComponent.
 *   The XAML should display the GoldDisplay property from the ViewModel.
 */
import {
  Component, OnEntityStartEvent, OnWorldUpdateEvent, OnWorldUpdateEventPayload,
  NetworkingService,
  CustomUiComponent,
  UiViewModel, uiViewModel,
  component, subscribe, property,
  type Maybe,
} from 'meta/worlds';
import { Events, ResourceType } from '../Types';

// ─── ViewModel ──────────────────────────────────────────────────────────
@uiViewModel()
class GoldCounterViewModel extends UiViewModel {
  /** Formatted gold display string (e.g., "G 1,234"). */
  GoldDisplay: string = '0';

  /**
   * Animation trigger counter. Increment this value to trigger the pulse animation.
   * The XAML uses PropertyChangedTrigger to detect changes and play the animation.
   */
  AnimationTrigger: number = 0;
}

// ─── Helper: Format number with unit suffix ──────────────────────────────
const SUFFIXES: [number, string][] = [
  [1e12, 'T'],
  [1e9,  'B'],
  [1e6,  'M'],
  [1e3,  'k'],
];

function formatGold(value: number): string {
  const n = Math.floor(value);
  for (const [threshold, suffix] of SUFFIXES) {
    if (n >= threshold) {
      const scaled = n / threshold;
      // Show 1 decimal only when it adds info (e.g. 1.2k but not 12.0k)
      const formatted = scaled >= 100 ? Math.floor(scaled).toString()
                      : scaled >= 10  ? scaled.toFixed(1).replace(/\.0$/, '')
                      :                 scaled.toFixed(2).replace(/\.?0+$/, '');
      return `${formatted}${suffix}`;
    }
  }
  return n.toString();
}

@component()
export class GoldCounterDisplay extends Component {

  // ─── Exposed Properties ───────────────────────────────────────────────
  /** Controls visibility of the GoldCounter UI element. */
  @property()
  isVisible: boolean = false;

  // ─── Internal state ───────────────────────────────────────────────────
  private _viewModel = new GoldCounterViewModel();
  private _uiComponent: Maybe<CustomUiComponent> = null;
  private _lastIsVisible: boolean = false;

  // ─── Lifecycle ────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    // UI is client-only
    if (NetworkingService.get().isServerContext()) return;

    // Cache UI component reference
    this._uiComponent = this.entity.getComponent(CustomUiComponent);
    if (this._uiComponent) {
      this._uiComponent.dataContext = this._viewModel;
      this._uiComponent.isVisible = false; // hidden until first gold
      this._lastIsVisible = false;
    }
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(_p: OnWorldUpdateEventPayload): void {
    // UI is client-only
    if (NetworkingService.get().isServerContext()) return;

    // Check if isVisible property changed and update UI component
    if (this._uiComponent && this.isVisible !== this._lastIsVisible) {
      this._uiComponent.isVisible = this.isVisible;
      this._lastIsVisible = this.isVisible;
    }
  }

  // ─── Event Handler ────────────────────────────────────────────────────

  @subscribe(Events.ResourceChanged)
  onResourceChanged(payload: Events.ResourceChangedPayload): void {
    // UI is client-only
    if (NetworkingService.get().isServerContext()) return;

    // Only update for Gold resource type
    if (payload.type !== ResourceType.Gold) return;

    // Hide until the player has earned their first gold
    if (this._uiComponent && !this._uiComponent.isVisible && payload.amount > 0)
      this._uiComponent.isVisible = true;

    this._viewModel.GoldDisplay = formatGold(payload.amount);

    // Trigger pulse animation by incrementing the counter
    this._viewModel.AnimationTrigger++;
  }
}
