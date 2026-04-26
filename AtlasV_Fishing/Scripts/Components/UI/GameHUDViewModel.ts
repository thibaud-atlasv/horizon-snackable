import {
  Component,
  CustomUiComponent,
  EventService,
  NetworkingService,
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

// ─── Module-level UiEvent declarations ──────────────────────────────────────────
@serializable()
class GameHUDCastPressedPayload {
  readonly parameter: string = '';
}
export const castPressedEvent = new UiEvent(
  'GameHUDViewModel-onCastPressed',
  GameHUDCastPressedPayload,
);

@serializable()
class GameHUDBuyLinePayload {
  readonly parameter: string = '';
}
export const buyLineEvent = new UiEvent(
  'GameHUDViewModel-onBuyLine',
  GameHUDBuyLinePayload,
);

@serializable()
class GameHUDBuyHookPayload {
  readonly parameter: string = '';
}
export const buyHookEvent = new UiEvent(
  'GameHUDViewModel-onBuyHook',
  GameHUDBuyHookPayload,
);

@serializable()
class GameHUDBuyBaitPayload {
  readonly parameter: string = '';
}
export const buyBaitEvent = new UiEvent(
  'GameHUDViewModel-onBuyBait',
  GameHUDBuyBaitPayload,
);

// ─── ViewModel ──────────────────────────────────────────────────────────────────
@uiViewModel()
export class GameHUDData extends UiViewModel {
  /** Fish caught counter */
  fishCount: number = 0;
  /** Gold amount */
  goldAmount: number = 0;

  /** Upgrade costs (display strings) */
  lineCost: string = '100';
  hookCost: string = '150';
  baitCost: string = '200';

  /** Upgrade levels */
  lineLevel: number = 1;
  hookLevel: number = 1;
  baitLevel: number = 1;

  /** Cast button label */
  castButtonText: string = 'CAST';

  /** HUD visibility — string-valued for XAML DataTrigger ('True'/'False') */
  isHudVisible: string = 'True';

  override readonly events = {
    castPressed: castPressedEvent,
    buyLine: buyLineEvent,
    buyHook: buyHookEvent,
    buyBait: buyBaitEvent,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────────
/**
 * GameHUDViewModel — binds the GameHUD XAML to a reactive ViewModel.
 *
 * Component Attachment: Scene entity with CustomUiComponent (GameHUD entity)
 * Component Networking: Local (UI only, client-side)
 * Component Ownership: Not Networked
 */
@component()
export class GameHUDViewModel extends Component {
  private _vm = new GameHUDData();
  private _ui: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) this._ui.dataContext = this._vm;
  }

  // ── UiEvent handlers (stub — log only) ─────────────────────────────────────
  @subscribe(castPressedEvent)
  private _onCastPressed(): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.CastRequested, {});
  }

  // ── Phase visibility ──────────────────────────────────────────────────
  @subscribe(Events.PhaseChanged)
  private _onPhase(p: Events.PhaseChangedPayload): void {
    if (p.phase === GamePhase.Idle) {
      this.showHUD();
    } else {
      this.hideHUD();
    }
  }

  @subscribe(buyLineEvent)
  private _onBuyLine(): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.BuyUpgrade, { upgrade: 'line' });
  }

  @subscribe(buyHookEvent)
  private _onBuyHook(): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.BuyUpgrade, { upgrade: 'hook' });
  }

  @subscribe(buyBaitEvent)
  private _onBuyBait(): void {
    if (NetworkingService.get().isServerContext()) return;
  }

  @subscribe(Events.ProgressLoaded)
  onProgressLoaded(p: Events.ProgressLoadedPayload): void {
    this._vm.goldAmount = p.gold;
    this._applyUpgradeLevels(p.lineLevel, p.hookLevel);
  }

  @subscribe(Events.GoldChanged)
  onGoldChanged(p: Events.GoldChangedPayload): void {
    this._vm.goldAmount = p.gold;
  }

  @subscribe(Events.UpgradesChanged)
  onUpgradesChanged(p: Events.UpgradesChangedPayload): void {
    this._applyUpgradeLevels(p.lineLevel, p.hookLevel);
  }

  private _applyUpgradeLevels(lineLevel: number, hookLevel: number): void {
    this._vm.lineLevel = lineLevel;
    this._vm.hookLevel = hookLevel;
    this._vm.lineCost = lineLevel < LINE_MAX_LEVEL ? `${upgradeCost(lineLevel + 1)}` : 'MAX';
    this._vm.hookCost = hookLevel < HOOK_MAX_LEVEL ? `${upgradeCost(hookLevel + 1)}` : 'MAX';
  }

  public setCastButtonText(text: string): void {
    this._vm.castButtonText = text;
  }

  /** Show the HUD with entrance animation */
  public showHUD(): void {
    this._vm.isHudVisible = 'True';
    if (this._ui)
      this._ui.isVisible = true;
  }

  /** Hide the HUD with exit animation — delays isVisible=false so exit anim can play */
  public hideHUD(): void {
    this._vm.isHudVisible = 'False';
    // Delay actual hide by 700ms to let staggered exit animation complete
    // (last element begins at 0.35s + 0.25s duration = 0.6s, rounded up)
    setTimeout(() => {
      if (this._ui && this._vm.isHudVisible === 'False') {
        this._ui.isVisible = false;
      }
    }, 700);
  }
}
