import {
  BasePlayerComponent,
  Component,
  CustomUiComponent,
  EventService,
  LeaderboardsService,
  NetworkingService,
  OnEntityStartEvent,
  OnLeaderboardUpdatedEvent,
  OnPlayerCreateEvent,
  PlayerService,
  UiViewModel,
  component,
  property,
  subscribe,
  uiViewModel,
  type OnLeaderboardUpdatedEventPayload,
  type OnPlayerCreateEventPayload,
} from 'meta/worlds';
import { ExecuteOn, type Entity, type Maybe } from 'meta/worlds';
import { Events, GamePhase, HUDEvents, LeaderboardEvents, NetworkEvents } from '../../Types';
import { LEADERBOARD_API_NAME } from '../../Constants';

const MAX_LEADERBOARD_ENTRIES = 10;

@uiViewModel()
export class LeaderboardRowData extends UiViewModel {
  rank: number = 0;
  playerName: string = '';
  score: number = 0;
  isCurrentPlayer: boolean = false;
  rankDisplay: string = '';
}

@uiViewModel()
export class LeaderboardHUDViewModelData extends UiViewModel {
  isVisible: boolean = false;
  title: string = '';
  titleColor: string = '#FFFFFF';
  yourScore: number = 0;
  yourRank: number = 0;
  yourRankDisplay: string = '';
  entries: readonly LeaderboardRowData[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
}

@component()
export class LeaderboardHUDViewModel extends Component {
  private _viewModel = new LeaderboardHUDViewModelData();
  private _customUi: Maybe<CustomUiComponent> = null;
  private _leaderboardService: LeaderboardsService = LeaderboardsService.get();
  private _playerService: Maybe<PlayerService> = null;
  private _localPlayer: Maybe<Entity> = null;
  private _server: boolean = false;

  @property()
  private leaderboardApiName: string = LEADERBOARD_API_NAME;

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    this._server = NetworkingService.get().isServerContext();
    if (this._server) return;

    this._customUi = this.entity.getComponent(CustomUiComponent);
    if (this._customUi) this._customUi.dataContext = this._viewModel;

    this._playerService = PlayerService.get();
    this._localPlayer = this._playerService.getLocalPlayer();

    this._viewModel.isVisible = false;
    this._setVisibility(false);
    this._setEntries(this._createPlaceholderEntries());
  }

  @subscribe(OnPlayerCreateEvent)
  onPlayerCreate(_payload: OnPlayerCreateEventPayload): void {
    this._fetchLeaderboardData();
  }

  @subscribe(HUDEvents.UpdateScore)
  onUpdateScore(p: HUDEvents.UpdateScorePayload): void {
    this._viewModel.yourScore = p.score;
    if (p.score > this.bestScore)
      EventService.sendGlobally(NetworkEvents.UpdateScore, { score: p.score })
  }

  @subscribe(NetworkEvents.UpdateScore, { execution: ExecuteOn.Everywhere })
  async onUpdateScoreNetwork(payload: NetworkEvents.UpdateScorePayload): Promise<void> {
    if (!this._server) {
      this._viewModel.yourScore = payload.score;
      return;
    }

    const players = PlayerService.get().getAllPlayers();
    const player = players[0];
    if (!player) return;

    const entry = await this._leaderboardService.fetchEntryForPlayer(
      player,
      this.leaderboardApiName
    ).catch(e => console.error(e));
    if (entry === undefined)
      return;
    if (entry)
      EventService.sendGlobally(NetworkEvents.UpdateLeaderboardEntry, { playerAlias: entry.playerAlias, rank: entry.rank, score: entry.score });

    if (entry === null || entry.score < payload.score) {
      await this._leaderboardService.updateEntryForPlayer(
        player,
        this.leaderboardApiName,
        payload.score,
        {}
      ).catch(e => console.error(e));
    }
  }

  @subscribe(OnLeaderboardUpdatedEvent)
  onLeaderboardUpdated(_payload: OnLeaderboardUpdatedEventPayload): void {
    this._fetchLeaderboardData();
  }

  // ── Phase Changes ────────────────────────────────────────────────────────────

  @subscribe(Events.PhaseChanged)
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (p.phase === GamePhase.GameOver || p.phase === GamePhase.End) {
      setTimeout(() => this._showLeaderboard(p.phase === GamePhase.End), 500);
    } else if (p.phase === GamePhase.Start || p.phase === GamePhase.Falling) {
      this._hideLeaderboard();
    }
  }
  @subscribe(LeaderboardEvents.ShowLeaderboard)
  onShowLeaderboard(p: LeaderboardEvents.ShowLeaderboardPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._viewModel.yourScore = p.finalScore;
    this._showLeaderboard(p.won);
  }

  @subscribe(LeaderboardEvents.HideLeaderboard)
  onHideLeaderboard(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._hideLeaderboard();
  }

  @subscribe(Events.Restart)
  onRestart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._hideLeaderboard();
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  private _showLeaderboard(won: boolean): void {
    this._viewModel.title = won ? 'VICTORY!' : 'GAME OVER';
    this._viewModel.titleColor = won ? '#FFD700' : '#FF4444';
    this._viewModel.errorMessage = '';
    this._viewModel.isVisible = true;
    this._setVisibility(true);
    this._fetchLeaderboardData();
  }

  private _hideLeaderboard(): void {
    this._viewModel.isVisible = false;
    this._setVisibility(false);
  }

  private _setVisibility(visible: boolean): void {
    if (this._customUi) this._customUi.isVisible = visible;
  }

  private bestScore = 0;
  @subscribe(NetworkEvents.UpdateLeaderboardEntry, { execution: ExecuteOn.Everywhere })
  private updateSelf(playerEntry: NetworkEvents.UpdateLeaderboardEntryPayload): void {
    if (playerEntry) {
      this._viewModel.yourRank = playerEntry.rank;
      this._viewModel.yourRankDisplay = this._formatRank(playerEntry.rank);
      this.bestScore = Math.max(this.bestScore, playerEntry.score);
    } else {
      this._viewModel.yourRank = 0;
      this._viewModel.yourRankDisplay = '--';
    }
  }

  private async _fetchLeaderboardData(): Promise<void> {
    if (!this._localPlayer) {
      this._viewModel.isLoading = true;
      this._viewModel.errorMessage = 'Leaderboard unavailable';
      return;
    }
    this._viewModel.errorMessage = '';
    try {
      const topEntries = await this._leaderboardService.fetchEntries(
        this.leaderboardApiName,
        { startingRank: 0, numEntries: MAX_LEADERBOARD_ENTRIES }
      ).catch(e => console.error(e));

      const playerEntry = await this._leaderboardService.fetchEntryForPlayer(
        this._localPlayer,
        this.leaderboardApiName
      ).catch(e => console.error(e));

      const playerComponent = this._localPlayer.getComponent(BasePlayerComponent);
      const currentPlayerAlias = playerComponent?.displayName ?? playerEntry?.playerAlias ?? 'YOU';

      if (topEntries) {
        const rows: LeaderboardRowData[] = [];
        for (const entry of topEntries) {
          const row = new LeaderboardRowData();
          row.rank = entry.rank;
          row.playerName = entry.playerAlias || 'Player';
          row.score = entry.score;
          row.rankDisplay = this._formatRank(entry.rank);
          row.isCurrentPlayer = currentPlayerAlias !== '' && entry.playerAlias === currentPlayerAlias;
          rows.push(row);
        }
        for (let i = rows.length; i < 10; i++) {
          const row = new LeaderboardRowData();
          row.rank = i + 1;
          row.playerName = '---';
          row.score = 0;
          row.rankDisplay = this._formatRank(i + 1);
          row.isCurrentPlayer = false;
          rows.push(row);
        }
        this._setEntries(rows);
      } else {
        this._viewModel.errorMessage = 'Could not load leaderboard';
      }
      this._viewModel.isLoading = false;
      if (playerEntry) this.updateSelf(playerEntry);
    } catch (error) {
      console.error(`[LeaderboardHUDViewModel] Error fetching leaderboard: ${error}`);
      this._viewModel.isLoading = false;
      this._viewModel.errorMessage = 'Could not load leaderboard';
    }
  }

  private _setEntries(newEntries: LeaderboardRowData[]): void {
    this._viewModel.entries = newEntries;
  }

  private _createPlaceholderEntries(): LeaderboardRowData[] {
    const rows: LeaderboardRowData[] = [];
    for (let i = 0; i < 5; i++) {
      const row = new LeaderboardRowData();
      row.rank = i + 1;
      row.playerName = '---';
      row.score = 0;
      row.rankDisplay = this._formatRank(i + 1);
      row.isCurrentPlayer = false;
      rows.push(row);
    }
    return rows;
  }

  private _formatRank(rank: number): string {
    if (rank <= 0) return '--';
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `${rank}th`;
  }
}
