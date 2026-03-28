import {
  component,
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  subscribe,
  uiViewModel,
  UiViewModel,
} from 'meta/worlds';

import { HUDEvents } from '../Types';

/**
 * ViewModel exposing reactive properties for HUD UI binding.
 * UI binds to these properties; changes trigger automatic UI updates.
 */
@uiViewModel()
export class GameHUDViewModelData extends UiViewModel {
  score: number = 0;
  level: number = 1;
  lives: number = 3;
  centerText: string = '';
  showCenterText: boolean = false;
}

/**
 * Component Attachment: Scene Entity (the entity hosting the CustomUiComponent for the HUD)
 * Component Networking: Local
 * Component Ownership: Not Networked
 *
 * Controller component that binds the ViewModel to the CustomUiComponent
 * and listens for HUD update events from other systems.
 */
@component()
export class GameHUDViewModel extends Component {
  private _viewModel = new GameHUDViewModelData();

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi) {
      customUi.dataContext = this._viewModel;
    }
  }

  // ── Event subscriptions ────────────────────────────────────────────────────

  @subscribe(HUDEvents.UpdateScore)
  onUpdateScore(payload: HUDEvents.UpdateScorePayload): void {
    this.setScore(payload.score);
  }

  @subscribe(HUDEvents.UpdateLevel)
  onUpdateLevel(payload: HUDEvents.UpdateLevelPayload): void {
    this.setLevel(payload.level);
  }

  @subscribe(HUDEvents.UpdateLives)
  onUpdateLives(payload: HUDEvents.UpdateLivesPayload): void {
    this.setLives(payload.lives);
  }

  @subscribe(HUDEvents.ShowMessage)
  onShowMessage(payload: HUDEvents.ShowMessagePayload): void {
    this.showMessage(payload.message);
  }

  @subscribe(HUDEvents.HideMessage)
  onHideMessage(_payload: HUDEvents.HideMessagePayload): void {
    console.log("hide");
    this.hideMessage();
  }

  // ── Public setters (for direct calls or testing) ───────────────────────────

  setScore(value: number): void {
    this._viewModel.score = value;
  }

  setLevel(value: number): void {
    this._viewModel.level = value;
  }

  setLives(value: number): void {
    this._viewModel.lives = value;
  }

  setCenterText(text: string): void {
    this._viewModel.centerText = text;
  }

  showMessage(text: string): void {
    this._viewModel.centerText = text;
    this._viewModel.showCenterText = true;
  }

  hideMessage(): void {
    this._viewModel.centerText = "";
    this._viewModel.showCenterText = false;
  }
}
