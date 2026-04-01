/**
 * ProgressBarsUIComponent — Drives fill-height and visibility for vertical progress bars.
 *
 * Component Attachment: Scene Entity with CustomUiComponent (UI/ProgressBars.xaml)
 * Component Networking: Local (client-only UI)
 * Component Ownership: N/A (local entity)
 *
 * Responsibilities:
 *   - Poll service state each tick to update ViewModel fill heights and visibility
 *   - Vault: fills up over lock duration
 *   - Frenzy: fills tap counter or drains active timer
 *   - Interest: fills up between payouts
 *   - Generator: shows first generator's cycle progress
 */
import {
  Component, OnEntityStartEvent,
  NetworkingService,
  CustomUiComponent,
  UiViewModel, uiViewModel,
  component, subscribe,
} from 'meta/worlds';
import { Events } from '../Types';
import { VaultService } from '../Services/VaultService';
import { FrenzyService } from '../Services/FrenzyService';
import { InterestService } from '../Services/InterestService';
import { GeneratorService } from '../Services/GeneratorService';

const MAX_FILL = 750;

@uiViewModel()
class ProgressBarsUIViewModel extends UiViewModel {
  VaultFillHeight: number = 0;
  FrenzyFillHeight: number = 0;
  InterestFillHeight: number = 0;
  GeneratorFillHeight: number = 0;

  VaultVisibility: string = 'Collapsed';
  FrenzyVisibility: string = 'Collapsed';
  InterestVisibility: string = 'Collapsed';
  GeneratorVisibility: string = 'Collapsed';

}

@component()
export class ProgressBarsUIComponent extends Component {

  private _viewModel = new ProgressBarsUIViewModel();

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    const ui = this.entity.getComponent(CustomUiComponent);
    if (ui) ui.dataContext = this._viewModel;
  }

  @subscribe(Events.Tick)
  onTick(_p: Events.TickPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._updateVault();
    this._updateFrenzy();
    this._updateInterest();
    this._updateGenerator();
  }

  private _updateVault(): void {
    const vault = VaultService.get();
    if (vault.isPurchased() && vault.isLocked()) {
      this._viewModel.VaultVisibility = 'Visible';
      const duration = vault.getDuration();
      const timeLeft = vault.getTimeLeft();
      const progress = duration > 0 ? 1 - (timeLeft / duration) : 0;
      this._viewModel.VaultFillHeight = Math.min(MAX_FILL, Math.max(0, progress * MAX_FILL));
    } else {
      this._viewModel.VaultVisibility = 'Collapsed';
      this._viewModel.VaultFillHeight = 0;
    }
  }

  private _updateFrenzy(): void {
    const frenzy = FrenzyService.get();
    if (!frenzy.isPurchased()) {
      this._viewModel.FrenzyVisibility = 'Collapsed';
      this._viewModel.FrenzyFillHeight = 0;
      return;
    }

    this._viewModel.FrenzyVisibility = 'Visible';

    if (frenzy.isActive()) {
      const duration = frenzy.getDuration();
      const timeLeft = frenzy.getTimeLeft();
      const progress = duration > 0 ? timeLeft / duration : 0;
      this._viewModel.FrenzyFillHeight = Math.min(MAX_FILL, Math.max(0, progress * MAX_FILL));
    } else {
      const tapCount = frenzy.getTapCount();
      const threshold = frenzy.getThreshold();
      const progress = threshold > 0 ? tapCount / threshold : 0;
      this._viewModel.FrenzyFillHeight = Math.min(MAX_FILL, Math.max(0, progress * MAX_FILL));
    }
  }

  private _updateInterest(): void {
    const interest = InterestService.get();
    if (!interest.isPurchased()) {
      this._viewModel.InterestVisibility = 'Collapsed';
      this._viewModel.InterestFillHeight = 0;
      return;
    }

    this._viewModel.InterestVisibility = 'Visible';
    const interval = interest.getInterval();
    const timeUntilNext = interest.getTimeUntilNext();
    const progress = interval > 0 ? 1 - (timeUntilNext / interval) : 0;
    this._viewModel.InterestFillHeight = Math.min(MAX_FILL, Math.max(0, progress * MAX_FILL));
  }

  private _updateGenerator(): void {
    const genData = GeneratorService.get().getFirstGeneratorCycleProgress();
    if (!genData.hasGenerator) {
      this._viewModel.GeneratorVisibility = 'Collapsed';
      this._viewModel.GeneratorFillHeight = 0;
      return;
    }

    this._viewModel.GeneratorVisibility = 'Visible';
    this._viewModel.GeneratorFillHeight = Math.min(MAX_FILL, Math.max(0, genData.progress * MAX_FILL));
  }
}
