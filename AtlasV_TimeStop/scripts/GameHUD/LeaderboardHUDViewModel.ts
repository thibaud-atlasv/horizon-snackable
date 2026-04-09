/**
 * LeaderboardHUDViewModel — ViewModel for the leaderboard UI displayed at game end.
 *
 * Component Attachment: Entity with CustomUiComponent in scene (LeaderboardHUD entity)
 * Component Networking: Local (client-only execution)
 * Component Ownership: Not Networked
 *
 * Displays:
 * - Top 10 player scores with ranks
 * - Highlights current player's rank
 * - Shows victory/game over title
 * - Appears at GameOver or End (Victory) phases
 *
 * Uses LeaderboardsService to fetch and submit scores.
 */

import {
  BasePlayerComponent,
  Component,
  CustomUiComponent,
  EventService,
  LeaderboardEntry,
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
import { Events, GamePhase, LeaderboardEvents, NetworkEvents } from '../Types';
import { LEADERBOARD_API_NAME } from '../Constants';

// Leaderboard API name - must match the leaderboard configured in the world settings
const MAX_LEADERBOARD_ENTRIES = 10;

/**
 * Single leaderboard row for UI binding.
 */
@uiViewModel()
export class LeaderboardRowData extends UiViewModel {
  rank: number = 0;
  playerName: string = '';
  score: number = 0;
  isCurrentPlayer: boolean = false;
  rankDisplay: string = '';
}

/**
 * ViewModel exposing reactive properties for Leaderboard UI binding.
 */
@uiViewModel()
export class LeaderboardHUDViewModelData extends UiViewModel {
  // Visibility
  isVisible: boolean = false;

  // Title (VICTORY! or GAME OVER)
  title: string = '';
  titleColor: string = '#FFFFFF';

  // Player's score display
  yourScore: number = 0;
  yourRank: number = 0;
  yourRankDisplay: string = '';

  // Leaderboard entries - must be readonly for UiViewModel
  entries: readonly LeaderboardRowData[] = [];

  // Loading state
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

  @property()
  private leaderboardApiName: string = LEADERBOARD_API_NAME;
  private _server: boolean = false;


  // ── Lifecycle ────────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    this._server = NetworkingService.get().isServerContext();
    if (this._server) return;

    this._customUi = this.entity.getComponent(CustomUiComponent);
    if (this._customUi) {
      this._customUi.dataContext = this._viewModel;
    }

    this._playerService = PlayerService.get();
    this._localPlayer = this._playerService.getLocalPlayer();

    // Start hidden
    this._viewModel.isVisible = false;
    this._setVisibility(false);
    this._setEntries(this._createPlaceholderEntries());
  }

  @subscribe(OnPlayerCreateEvent)
  onPlayerCreate(payload: OnPlayerCreateEventPayload): void {
    this._fetchLeaderboardData();
  }



  @subscribe(NetworkEvents.UpdateScore, { execution: ExecuteOn.Everywhere })
  async onUpdateScore(payload: NetworkEvents.UpdateScorePayload): Promise<void> {
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
    if (entry)
      EventService.sendGlobally(NetworkEvents.UpdateLeaderboardEntry, { playerAlias: entry.playerAlias, rank:entry.rank, score: entry.score});

    if (!entry || entry.score < payload.score) {
      await this._leaderboardService.updateEntryForPlayer(
        player,
        this.leaderboardApiName,
        payload.score,
        {}
      ).catch(e => console.error(e));
    }
  }

  @subscribe(OnLeaderboardUpdatedEvent)
  onLeaderboardUpdated(
    payload: OnLeaderboardUpdatedEventPayload
  ) {
    this._fetchLeaderboardData();
  }


  // ── Phase Changes ────────────────────────────────────────────────────────────

  @subscribe(Events.PhaseChanged)
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    if (p.phase === GamePhase.GameOver || p.phase === GamePhase.End) {
      setTimeout(() => {
        this._showLeaderboard(p.phase === GamePhase.End);
      }, 500);
    } else if (p.phase === GamePhase.Start || p.phase === GamePhase.Falling) {
      this._hideLeaderboard();
    }
  }

  // ── Show Leaderboard Event ───────────────────────────────────────────────────

  @subscribe(LeaderboardEvents.ShowLeaderboard)
  onShowLeaderboard(p: LeaderboardEvents.ShowLeaderboardPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._viewModel.yourScore = p.finalScore;
    this._showLeaderboard(p.won);
  }

  // ── Hide Leaderboard Event ───────────────────────────────────────────────────

  @subscribe(LeaderboardEvents.HideLeaderboard)
  onHideLeaderboard(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._hideLeaderboard();
  }

  // ── Restart Event ────────────────────────────────────────────────────────────

  @subscribe(Events.Restart)
  onRestart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._hideLeaderboard();
  }

  // ── Internal Methods ─────────────────────────────────────────────────────────

  private _showLeaderboard(won: boolean): void {
    // Set title based on victory/defeat
    if (won) {
      this._viewModel.title = 'VICTORY!';
      this._viewModel.titleColor = '#FFD700';
    } else {
      this._viewModel.title = 'GAME OVER';
      this._viewModel.titleColor = '#FF4444';
    }

    this._viewModel.errorMessage = '';
    this._viewModel.isVisible = true;
    this._setVisibility(true);

    // Fetch leaderboard data
    this._fetchLeaderboardData();
  }

  private _hideLeaderboard(): void {
    this._viewModel.isVisible = false;
    this._setVisibility(false);
  }

  private _setVisibility(visible: boolean): void {
    if (this._customUi) {
      this._customUi.isVisible = visible;
    }
  }

  @subscribe(NetworkEvents.UpdateLeaderboardEntry, { execution: ExecuteOn.Everywhere })
  private updateSelf(playerEntry: NetworkEvents.UpdateLeaderboardEntryPayload) {
    // Update player's rank info
    if (playerEntry) {
      this._viewModel.yourRank = playerEntry.rank;
      this._viewModel.yourRankDisplay = this._formatRank(playerEntry.rank);
      this._viewModel.yourScore = playerEntry.score;
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
    this._viewModel.errorMessage = "";
    try {
      // Fetch top entries (startingRank is 0-indexed per MHS API)
      const topEntries = await this._leaderboardService.fetchEntries(
        this.leaderboardApiName,
        {
          startingRank: 0,
          numEntries: MAX_LEADERBOARD_ENTRIES,
        }
      ).catch(e => console.error(e));
      // Fetch current player's entry to get their rank
      const playerEntry = await this._leaderboardService.fetchEntryForPlayer(
        this._localPlayer,
        this.leaderboardApiName
      ).catch((e) => console.error(e));

      const playerComponent = this._localPlayer.getComponent(BasePlayerComponent);
      const currentPlayerAlias = playerComponent?.displayName ?? playerEntry?.playerAlias ?? "YOU";

      // Build leaderboard rows
      if (topEntries)
      {
        const rows: LeaderboardRowData[] = [];
        for (const entry of topEntries) {
          const row = new LeaderboardRowData();
          row.rank = entry.rank;
          row.playerName = entry.playerAlias || 'Player';
          row.score = entry.score;
          row.rankDisplay = this._formatRank(entry.rank);
          // Check if this is the current player by comparing aliases
          row.isCurrentPlayer = currentPlayerAlias !== '' && entry.playerAlias === currentPlayerAlias;
          rows.push(row);
        }
        // fill emptry rows
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
      }
      else
        this._viewModel.errorMessage = 'Could not load leaderboard';
      this._viewModel.isLoading = false;
      if (playerEntry)
        this.updateSelf(playerEntry);
    } catch (error) {
      console.error(`[LeaderboardHUDViewModel] Error fetching leaderboard: ${error}`);
      this._viewModel.isLoading = false;
      this._viewModel.errorMessage = 'Could not load leaderboard';
    }
  }

  private _setEntries(newEntries: LeaderboardRowData[]): void {
    // Cast to update the readonly array
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
