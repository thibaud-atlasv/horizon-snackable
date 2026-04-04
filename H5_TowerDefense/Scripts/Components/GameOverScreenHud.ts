/**
 * GameOverScreenHud — Displays the Game Over / Victory screen overlay.
 *
 * Component Attachment: Scene entity (GameOverScreenUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, but UI logic runs on client via ExecuteOn.Owner
 *
 * Shows a full-screen overlay when the game ends (victory or defeat).
 * Displays stats and allows the player to tap anywhere to restart.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  EventService,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
  UiEvent,
  CustomUiComponent,
  serializable,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, UiEvents } from '../Types';

// ── Module-level UiEvent constants ──────────────────────────────────────────

@serializable()
export class RestartTapPayload {
  readonly parameter: string = '';
}

const restartTapEvent = new UiEvent('GameOverScreenViewModel-onRestartTap', RestartTapPayload);

// ── ViewModel ───────────────────────────────────────────────────────────────

@uiViewModel()
export class GameOverScreenViewModel extends UiViewModel {
  override readonly events = {
    restartTap: restartTapEvent,
  };

  visible: boolean = false;
  isVictory: boolean = false;
  enemiesKilled: number = 0;
  goldEarned: number = 0;
  wavesCompleted: number = 0;
  totalWaves: number = 10;
}

// ── Component ───────────────────────────────────────────────────────────────

@component()
export class GameOverScreenHud extends Component {
  private viewModel: Maybe<GameOverScreenViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  // Track stats during gameplay
  private _enemiesKilled: number = 0;
  private _goldEarned: number = 0;
  private _wavesCompleted: number = 0;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.viewModel = new GameOverScreenViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;
  }

  // ── Events ────────────────────────────────────────────────────────────────

  /**
   * Track enemy kills for stats
   */
  @subscribe(Events.EnemyDied, { execution: ExecuteOn.Owner })
  onEnemyDied(payload: Events.EnemyDiedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._enemiesKilled++;
    this._goldEarned += payload.reward;
  }

  /**
   * Track wave completion for stats
   */
  @subscribe(Events.WaveCompleted, { execution: ExecuteOn.Owner })
  onWaveCompleted(_payload: Events.WaveCompletedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._wavesCompleted++;
  }

  /**
   * When the game ends, show the overlay with stats
   */
  @subscribe(Events.GameOver, { execution: ExecuteOn.Owner })
  onGameOver(payload: Events.GameOverPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    this.viewModel.isVictory = payload.won;
    this.viewModel.enemiesKilled = this._enemiesKilled;
    this.viewModel.goldEarned = this._goldEarned;
    this.viewModel.wavesCompleted = this._wavesCompleted;

    // Show the overlay
    this.viewModel.visible = true;
  }

  /**
   * When the overlay is tapped, fire restart event and hide
   */
  @subscribe(restartTapEvent, { execution: ExecuteOn.Owner })
  onRestartTap(_payload: RestartTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    this.viewModel.visible = false;
    this._enemiesKilled = 0;
    this._goldEarned = 0;
    this._wavesCompleted = 0;

    // Fire restart event
    EventService.sendLocally(Events.RestartGame, new Events.RestartGamePayload());
  }
}

// ── Export UiEvent for Types.ts ─────────────────────────────────────────────

export namespace GameOverUiEvents {
  export const restartTap = restartTapEvent;
  export type RestartTapPayload = typeof RestartTapPayload;
}
