import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
  CustomUiComponent,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events } from '../Types';
import { ResourceService } from '../Services/ResourceService';
import { START_GOLD, START_LIVES } from '../Constants';
import { LEVEL_DEFS } from '../Defs/LevelDefs';

@uiViewModel()
export class GameHudViewModel extends UiViewModel {
  lives: number = START_LIVES;
  gold: number = START_GOLD;
  waveNumber: number = 1;
  totalWaves: number = 10;
  waveText: string = '1/10';
}

@component()
export class GameHudController extends Component {
  private viewModel: Maybe<GameHudViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.viewModel = new GameHudViewModel();
    this.uiComponent.dataContext = this.viewModel;

    const resourceSvc = ResourceService.get();
    this.viewModel.lives = resourceSvc.lives;
    this.viewModel.gold = resourceSvc.gold;
    this.viewModel.waveNumber = 1;
    this.viewModel.totalWaves = LEVEL_DEFS[0].waves.length;
    this._updateWaveText();
  }

  @subscribe(Events.ResourceChanged, { execution: ExecuteOn.Owner })
  onResourceChanged(payload: Events.ResourceChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.lives = payload.lives;
    this.viewModel.gold = payload.gold;
  }

  @subscribe(Events.WaveStarted, { execution: ExecuteOn.Owner })
  onWaveStarted(payload: Events.WaveStartedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.waveNumber = payload.waveIndex + 1; // 1-based display
    this.viewModel.totalWaves = payload.totalWaves;
    this._updateWaveText();
  }

  @subscribe(Events.RestartGame, { execution: ExecuteOn.Owner })
  onRestart(_p: Events.RestartGamePayload): void {
    if (!this.viewModel) return;
    this.viewModel.waveNumber = 1;
    this.viewModel.totalWaves = LEVEL_DEFS[0].waves.length;
    this._updateWaveText();
  }

  private _updateWaveText(): void {
    if (!this.viewModel) return;
    this.viewModel.waveText = `${this.viewModel.waveNumber}/${this.viewModel.totalWaves}`;
  }
}
