import {
  Component,
  CustomUiComponent,
  EventService,
  NetworkingService,
  OnEntityDestroyEvent,
  OnEntityStartEvent,
  UiEvent,
  UiViewModel,
  component,
  serializable,
  subscribe,
  uiViewModel,
  type Maybe,
} from 'meta/worlds';

import { Events, GamePhase } from '../../Types';
import { upgradeCost, LINE_MAX_LEVEL, HOOK_MAX_LEVEL } from '../../Constants';

// ─── Module-level UiEvent declarations (unique prefixed IDs) ─────────────────
@serializable()
class InteractiveHUDCastPressedPayload {
  readonly parameter: string = '';
}
export const interactiveCastPressedEvent = new UiEvent(
  'InteractiveHUD-onCastPressed',
  InteractiveHUDCastPressedPayload,
);

@serializable()
class InteractiveHUDBuyLinePayload {
  readonly parameter: string = '';
}
export const interactiveBuyLineEvent = new UiEvent(
  'InteractiveHUD-onBuyLine',
  InteractiveHUDBuyLinePayload,
);

@serializable()
class InteractiveHUDBuyHookPayload {
  readonly parameter: string = '';
}
export const interactiveBuyHookEvent = new UiEvent(
  'InteractiveHUD-onBuyHook',
  InteractiveHUDBuyHookPayload,
);

@serializable()
class InteractiveHUDBuyBaitPayload {
  readonly parameter: string = '';
}
export const interactiveBuyBaitEvent = new UiEvent(
  'InteractiveHUD-onBuyBait',
  InteractiveHUDBuyBaitPayload,
);

// ─── ViewModel ──────────────────────────────────────────────────────────────
@uiViewModel()
export class InteractiveHUDData extends UiViewModel {
  /** Cast button label */
  castButtonText: string = 'CAST';

  /** HUD visibility — string for XAML DataTrigger ('True'/'False') */
  isHudVisible: string = 'True';

  /** Whether root is hit-test-visible. True only during IDLE. */
  isInteractive: boolean = true;

  /** Upgrade levels */
  lineLevel: number = 1;
  hookLevel: number = 1;
  baitLevel: number = 1;

  /** Upgrade costs (display strings) */
  lineCost: string = '100';
  hookCost: string = '150';
  baitCost: string = '200';

  override readonly events = {
    castPressed: interactiveCastPressedEvent,
    buyLine: interactiveBuyLineEvent,
    buyHook: interactiveBuyHookEvent,
    buyBait: interactiveBuyBaitEvent,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────
/**
 * InteractiveHUDViewModel — drives the InteractiveHUD XAML (buttons only).
 *
 * The key behaviour: when NOT in Idle phase, play hide animation then set
 * `customUI.isVisible = false` so the interactive layer stops blocking swipe.
 * When returning to Idle, set `isVisible = true` first, then trigger the show
 * animation so the XAML transition can play.
 *
 * Component Attachment: Scene entity (InteractiveHUD entity)
 * Component Networking: Local (UI only, client-side)
 * Component Ownership: Not Networked
 */
@component()
export class InteractiveHUDViewModel extends Component {
  private _vm = new InteractiveHUDData();
  private _ui: Maybe<CustomUiComponent> = null;

  /** Track hide timer so we can cancel it if show is requested mid-hide */
  private _hideTimerId: number = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[InteractiveHUDViewModel] onStart');
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) this._ui.dataContext = this._vm;
  }

  @subscribe(OnEntityDestroyEvent)
  onDestroy(): void {
    if (this._hideTimerId) {
      clearInterval(this._hideTimerId);
      this._hideTimerId = 0;
    }
  }

  // ── UiEvent handlers ─────────────────────────────────────────────────────
  @subscribe(interactiveCastPressedEvent)
  private _onCastPressed(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[InteractiveHUDViewModel] Cast pressed');
    EventService.sendLocally(Events.CastRequested, {});
  }

  @subscribe(interactiveBuyLineEvent)
  private _onBuyLine(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[InteractiveHUDViewModel] Buy line');
    EventService.sendLocally(Events.BuyUpgrade, { upgrade: 'line' });
  }

  @subscribe(interactiveBuyHookEvent)
  private _onBuyHook(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[InteractiveHUDViewModel] Buy hook');
    EventService.sendLocally(Events.BuyUpgrade, { upgrade: 'hook' });
  }

  @subscribe(interactiveBuyBaitEvent)
  private _onBuyBait(): void {
    if (NetworkingService.get().isServerContext()) return;
  }

  // ── Phase visibility ─────────────────────────────────────────────────────
  @subscribe(Events.PhaseChanged)
  private _onPhase(p: Events.PhaseChangedPayload): void {
    if (p.phase === GamePhase.Idle) {
      this._showHUD();
    } else {
      this._hideHUD();
    }
  }

  // ── Upgrade data updates ─────────────────────────────────────────────────
  @subscribe(Events.ProgressLoaded)
  private _onProgressLoaded(p: Events.ProgressLoadedPayload): void {
    this._applyUpgradeLevels(p.lineLevel, p.hookLevel);
  }

  @subscribe(Events.UpgradesChanged)
  private _onUpgradesChanged(p: Events.UpgradesChangedPayload): void {
    this._applyUpgradeLevels(p.lineLevel, p.hookLevel);
  }

  private _applyUpgradeLevels(lineLevel: number, hookLevel: number): void {
    this._vm.lineLevel = lineLevel;
    this._vm.hookLevel = hookLevel;
    this._vm.lineCost = lineLevel < LINE_MAX_LEVEL ? `${upgradeCost(lineLevel + 1)}` : 'MAX';
    this._vm.hookCost = hookLevel < HOOK_MAX_LEVEL ? `${upgradeCost(hookLevel + 1)}` : 'MAX';
  }

  // ── Show / Hide with isVisible gating ────────────────────────────────────
  /** Show: set isVisible=true FIRST so XAML can render, then trigger animation */
  private _showHUD(): void {
    // Cancel any pending hide
    if (this._hideTimerId) {
      clearInterval(this._hideTimerId);
      this._hideTimerId = 0;
    }

    if (this._ui) this._ui.isVisible = true;
    this._vm.isInteractive = true;
    this._vm.isHudVisible = 'True';
  }

  /** Hide: play exit animation, then after 700ms set isVisible=false */
  private _hideHUD(): void {
    this._vm.isHudVisible = 'False';
    this._vm.isInteractive = false;

    // Cancel any previous pending hide
    if (this._hideTimerId) {
      clearInterval(this._hideTimerId);
      this._hideTimerId = 0;
    }

    // Delay isVisible=false until exit animation completes (~700ms)
    this._hideTimerId = setInterval(() => {
      clearInterval(this._hideTimerId);
      this._hideTimerId = 0;
      if (this._ui && this._vm.isHudVisible === 'False') {
        this._ui.isVisible = false;
      }
    }, 700) as unknown as number;
  }
}
