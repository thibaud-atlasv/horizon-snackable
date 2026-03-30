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
 *   - Animate button with bounce effect (scale 1.0 → 1.2 → 1.0)
 *
 * ── Does NOT own ────────────────────────────────────────────────────────
 *   - Tap logic → TapService (processes Events.PlayerTap)
 *   - Resources → ResourceService
 *
 * ── Scene setup ─────────────────────────────────────────────────────────
 *   Attach this component to an entity with a CustomUiComponent.
 *   The XAML should contain a Button that fires 'TapButtonClickEvent'.
 */
import {
  Component, OnEntityStartEvent, OnWorldUpdateEvent,
  NetworkingService, EventService,
  CustomUiComponent,
  TransformComponent,
  Vec3,
  UiEvent, UiViewModel, uiViewModel,
  lerp,
  component, subscribe,
  type Maybe,
  type OnWorldUpdateEventPayload,
} from 'meta/worlds';
import { Events } from '../Types';

// ─── Animation Constants ────────────────────────────────────────────────────
/** Target scale when bounce reaches peak. */
const BOUNCE_SCALE = 1.2;
/** Duration (seconds) for scale-up phase. */
const BOUNCE_UP_DURATION = 0.08;
/** Duration (seconds) for scale-down phase. */
const BOUNCE_DOWN_DURATION = 0.12;

// ─── UiEvent ────────────────────────────────────────────────────────────────
const tapButtonClickEvent = new UiEvent('TapButtonClickEvent');

// ─── ViewModel ──────────────────────────────────────────────────────────────
@uiViewModel()
class TapButtonViewModel extends UiViewModel {
  /** Button label text (can be customized). */
  ButtonLabel: string = 'TAP!';

  /** Expose the click event for XAML binding. */
  override readonly events = {
    buttonClick: tapButtonClickEvent,
  };
}

// ─── Bounce Animation State ─────────────────────────────────────────────────
const enum BouncePhase {
  Idle = 0,
  ScaleUp = 1,
  ScaleDown = 2,
}

@component()
export class TapButtonUIComponent extends Component {

  // ─── Internal state ───────────────────────────────────────────────────────
  private _viewModel = new TapButtonViewModel();
  private _transform: Maybe<TransformComponent> = null;

  /** Current bounce animation phase. */
  private _bouncePhase: BouncePhase = BouncePhase.Idle;
  /** Elapsed time in the current bounce phase. */
  private _bounceTime: number = 0;
  /** Base scale to return to after bounce. */
  private _baseScale: Vec3 = Vec3.one;

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    // UI is client-only
    if (NetworkingService.get().isServerContext()) return;

    this._transform = this.entity.getComponent(TransformComponent);
    if (this._transform) {
      this._baseScale = this._transform.localScale;
    }

    // Bind ViewModel to the CustomUiComponent
    const ui = this.entity.getComponent(CustomUiComponent);
    if (ui) {
      ui.dataContext = this._viewModel;
      console.log('[TapButtonUIComponent] ViewModel bound to CustomUiComponent');
    } else {
      console.warn('[TapButtonUIComponent] No CustomUiComponent found on entity');
    }
  }

  // ─── UI Event Handler ─────────────────────────────────────────────────────

  @subscribe(tapButtonClickEvent)
  onButtonClick(): void {
    console.log('[TapButtonUIComponent] Button clicked, firing PlayerTap');

    // Fire the same event that touch input fires
    EventService.sendLocally(Events.PlayerTap, {});

    // Start bounce animation
    this._startBounce();
  }

  // ─── Bounce Animation ─────────────────────────────────────────────────────

  private _startBounce(): void {
    this._bouncePhase = BouncePhase.ScaleUp;
    this._bounceTime = 0;
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    // Animation is client-only
    if (NetworkingService.get().isServerContext()) return;
    if (this._bouncePhase === BouncePhase.Idle) return;
    if (!this._transform) return;

    const dt = p.deltaTime;
    this._bounceTime += dt;

    if (this._bouncePhase === BouncePhase.ScaleUp) {
      // Scale up phase
      const t = Math.min(this._bounceTime / BOUNCE_UP_DURATION, 1);
      const scale = lerp(1, BOUNCE_SCALE, t);
      this._transform.localScale = this._baseScale.mul(scale);

      if (t >= 1) {
        // Transition to scale-down phase
        this._bouncePhase = BouncePhase.ScaleDown;
        this._bounceTime = 0;
      }
    } else if (this._bouncePhase === BouncePhase.ScaleDown) {
      // Scale down phase
      const t = Math.min(this._bounceTime / BOUNCE_DOWN_DURATION, 1);
      const scale = lerp(BOUNCE_SCALE, 1, t);
      this._transform.localScale = this._baseScale.mul(scale);

      if (t >= 1) {
        // Animation complete
        this._bouncePhase = BouncePhase.Idle;
        this._transform.localScale = this._baseScale;
      }
    }
  }
}
