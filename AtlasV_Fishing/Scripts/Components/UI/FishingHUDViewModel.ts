import {
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  OnFocusedInteractionInputStartedEvent,
  OnFocusedInteractionInputEndedEvent,
  UiViewModel,
  component,
  subscribe,
  uiViewModel,
  type Maybe,
} from 'meta/worlds';
import type { OnFocusedInteractionInputEventPayload } from 'meta/worlds';

import { Events, HUDEvents } from '../../Types';
import { GamePhase } from '../../Types';
import { FishCollectionService } from '../../Services/FishCollectionService';
import { FISH_DEFS } from '../../FishDefs';

const TOTAL_FISH_COUNT = FISH_DEFS.length;
const XP_BAR_WIDTH     = 868; // 880 - 12 (margins), must match XAML

@uiViewModel()
export class FishingHUDData extends UiViewModel {
  isHudVisible      : string  = 'False';
  fishDiscovered    : number  = 0;
  fishTotal         : number  = TOTAL_FISH_COUNT;
  progressPercent   : number  = 0;
  progressBarWidth  : number  = 0;
  progressBarVisible: boolean = false;
  fishProgressText  : string  = `0/${TOTAL_FISH_COUNT}`;
  isSwipeHintVisible: string  = 'False';
}

@component()
export class FishingHUDViewModel extends Component {

  private _vm  = new FishingHUDData();
  private _ui: Maybe<CustomUiComponent> = null;
  private _isDiving  = false;
  private _isTouching = false;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) this._ui.dataContext = this._vm;
    this._updateProgressBar();
  }

  @subscribe(Events.FishCaught)
  onFishCaught(_p: Events.FishCaughtPayload): void {
    this._updateProgressBar();
    this._vm.progressBarVisible = true;
  }

  @subscribe(HUDEvents.UpdateProgress)
  onUpdateProgress(_p: HUDEvents.UpdateProgressPayload): void {
    this._updateProgressBar();
  }

  @subscribe(HUDEvents.HideCatch)
  onHideCatch(_p: HUDEvents.HideCatchPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._vm.progressBarVisible = false;
  }

  private _updateProgressBar(): void {
    const discovered          = FishCollectionService.get().totalUnique();
    const percent             = TOTAL_FISH_COUNT > 0 ? (discovered / TOTAL_FISH_COUNT) * 100 : 0;
    this._vm.fishDiscovered   = discovered;
    this._vm.progressPercent  = percent;
    this._vm.progressBarWidth = (percent / 100) * XP_BAR_WIDTH;
    this._vm.fishProgressText = `${discovered}/${TOTAL_FISH_COUNT}`;
  }

  @subscribe(Events.PhaseChanged)
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    this._isDiving = p.phase === GamePhase.Diving;
    this._updateSwipeHint();
  }

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStart(_p: OnFocusedInteractionInputEventPayload): void {
    this._isTouching = true;
    this._updateSwipeHint();
  }

  @subscribe(OnFocusedInteractionInputEndedEvent)
  onTouchEnd(_p: OnFocusedInteractionInputEventPayload): void {
    this._isTouching = false;
    this._updateSwipeHint();
  }

  private _updateSwipeHint(): void {
    this._vm.isSwipeHintVisible = (this._isDiving && !this._isTouching) ? 'True' : 'False';
  }
}
