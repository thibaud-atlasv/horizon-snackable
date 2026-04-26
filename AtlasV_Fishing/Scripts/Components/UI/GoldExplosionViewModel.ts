import {
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  UiViewModel,
  component,
  subscribe,
  uiViewModel,
  type Maybe,
} from 'meta/worlds';

// ─── ViewModel ──────────────────────────────────────────────────────
@uiViewModel()
export class GoldExplosionUiData extends UiViewModel {
  /** Bound text, e.g. "+25" */
  goldValue: string = '';
  /** DataTrigger trigger — string 'True'/'False' for reliable XAML re-trigger */
  isPlaying: string = 'False';
}

// ─── Component ──────────────────────────────────────────────────────
/**
 * GoldExplosionViewModel — binds the GoldExplosion XAML to a reactive ViewModel.
 * Provides a public `play(value)` method for external callers to trigger the effect.
 *
 * Component Attachment: Template entity with CustomUiComponent (GoldExplosion template)
 * Component Networking: Local (client-side visual effect only)
 * Component Ownership: Not Networked
 */
@component()
export class GoldExplosionViewModel extends Component {
  private _vm = new GoldExplosionUiData();
  private _ui: Maybe<CustomUiComponent> = null;
  private _resetTimer: number = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) {
      this._ui.dataContext = this._vm;
      this._ui.isVisible = false; // start hidden for pool
    }
  }

  /** Call to play the explosion. Sets value text and triggers XAML animation. */
  public play(value: number): void {
    // Reset for re-use
    if (this._resetTimer) clearTimeout(this._resetTimer);

    this._vm.goldValue = `+${value}`;
    this._vm.isPlaying = 'False'; // reset trigger first

    if (this._ui) this._ui.isVisible = true;

    // Use setTimeout to ensure XAML sees the False→True transition
    setTimeout(() => {
      this._vm.isPlaying = 'True';
    }, 16);

    // Auto-reset after animation duration (500ms + buffer)
    this._resetTimer = setTimeout(() => {
      this._vm.isPlaying = 'False';
      if (this._ui) this._ui.isVisible = false;
      this._resetTimer = 0;
    }, 600) as unknown as number;
  }
}
