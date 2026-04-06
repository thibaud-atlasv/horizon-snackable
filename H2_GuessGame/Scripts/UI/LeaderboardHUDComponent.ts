/**
 * LeaderboardHUDComponent — Displays the leaderboard at game over.
 *
 * Component Attachment: Entity with CustomUiComponent (LeaderboardHUD entity)
 *
 * Flow (MHS leaderboard services run server-side only):
 *   [Server] onStart                       → fetch player entry + top 10 → sendGlobally(InitLeaderboardData)
 *   [Client] NetworkEvents.InitLeaderboard → cache bestScore, bestRank, top entries
 *   [Client] Events.GameOver               → show UI; if finalScore > bestScore → sendGlobally(SubmitScore)
 *   [Server] NetworkEvents.SubmitScore     → update entry + fetch top → sendGlobally(LeaderboardData)
 *   [Client] NetworkEvents.LeaderboardData → update ViewModel with fresh data + update client cache
 */

import {
  Component, component,
  CustomUiComponent,
  OnEntityStartEvent,
  NetworkingService,
  LeaderboardsService,
  PlayerService,
  BasePlayerComponent,
  EventService,
  ExecuteOn,
  subscribe,
  property,
  type Maybe,
  type Entity,
  type LeaderboardEntry,
  OnPlayerCreateEvent,
  type OnPlayerCreateEventPayload,
} from 'meta/worlds';
import { Events, NetworkEvents } from '../Types';
import { LEADERBOARD_API_NAME } from '../Constants';
import {
  LeaderboardHUDViewModelData,
  LeaderboardRowData,
} from './LeaderboardHUDViewModel';

const MAX_ENTRIES = 10;

@component()
export class LeaderboardHUDComponent extends Component {
  leaderboardApiName: string = LEADERBOARD_API_NAME;

  private lbService = LeaderboardsService.get();
  private _isServer = false;
  private _vm       = new LeaderboardHUDViewModelData();
  private _customUi: Maybe<CustomUiComponent> = null;

  // server cach top entries, client store in _vm  
  private _serverTopEntries: Maybe<LeaderboardEntry[]> = null;

  // Both: cached best score — undefined = fetch not yet done; 0 = player has no entry
  private _cachedScore?: number = undefined;
  private _cachedRank?: number = undefined;

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    this._isServer = NetworkingService.get().isServerContext();

    if (this._isServer) {
      this._fetchTopEntries();
      return;
    }

    this._customUi = this.entity.getComponent(CustomUiComponent);
    if (this._customUi) this._customUi.dataContext = this._vm;

    this._setVisibility(false);
    this._vm.entries = this._placeholderEntries();
  }

  @subscribe(OnPlayerCreateEvent, {execution: ExecuteOn.Everywhere})
  onPlayerCreate(p: OnPlayerCreateEventPayload): void {
    if (!p.entity || !this._isServer) return;
    this._fetchForPlayer(p.entity);
    
  }

  // ─── Server: initial fetch at scene start ─────────────────────────────────

  // Wraps a promise with a timeout — the SDK can hang indefinitely under rate limit
  // instead of rejecting, so .catch() alone is not enough.
  private async _withTimeout<T>(promise: Promise<T>, label: string, ms = 8000): Promise<T | null> {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => { console.warn(`[LB][S] ${label} — timed out after ${ms}ms`); resolve(null); }, ms)
    );
    return Promise.race([promise, timeout]).catch((e) => { console.error(`[LB][S] ${label} — error`, e); return null; });
  }

  private async _fetchForPlayer(player: Entity): Promise<void>
  {
    console.log('[LB][S] fetchForPlayer — start');
    const entry = await this._withTimeout(
      this.lbService.fetchEntryForPlayer(player, this.leaderboardApiName),
      'fetchForPlayer',
    );
    this._cachedScore = entry?.score ?? 0; // 0 = no entry (distinct from undefined = fetch not done)
    this._cachedRank  = entry?.rank;
    console.log(`[LB][S] fetchForPlayer — score=${this._cachedScore} rank=${this._cachedRank ?? 'none'}`);
    EventService.sendGlobally(NetworkEvents.LeaderboardPlayerData, {
      yourBestScore: this._cachedScore,
      yourRank:      this._cachedRank ?? 0,
    });
  }

  private async _fetchTopEntries(): Promise<void> {
    console.log('[LB][S] fetchTopEntries — start');
    this._serverTopEntries = await this._withTimeout(
      this.lbService.fetchEntries(this.leaderboardApiName),
      'fetchTopEntries',
    );
    console.log(`[LB][S] fetchTopEntries — ${this._serverTopEntries?.length ?? 'failed'} entries`);

    const names:  string[] = [];
    const scores: number[] = [];
    const ranks:  number[] = [];

    if (this._serverTopEntries) {
      for (const e of this._serverTopEntries) {
        names.push(e.playerAlias || 'Player');
        scores.push(e.score);
        ranks.push(e.rank);
      }
      for (let i = this._serverTopEntries.length; i < MAX_ENTRIES; i++) {
        names.push('---'); scores.push(0); ranks.push(i + 1);
      }
    }

    EventService.sendGlobally(NetworkEvents.LeaderboardData, {
      playerNames:        names,
      playerScores:       scores,
      playerRanks:        ranks,
    });
  }

  // ─── Client: game over → show UI, submit only if new high score ───────────


  @subscribe(Events.AnswerResult)
  onAnswerResult(p: Events.AnswerResultPayload): void {
    if (this._isServer) return;
    // on wrong answer, send the final score before gameover to reduce refresh time
    if ((this._cachedScore ?? 0) < p.newScore && !p.correct)
      EventService.sendGlobally(NetworkEvents.SubmitScore, { score: p.newScore });
  }

  @subscribe(Events.GameOver)
  onGameOver(p: Events.GameOverPayload): void {
    if (this._isServer) return;

    this._vm.yourScore    = p.finalScore;
    this._vm.errorMessage = '';
    this._setVisibility(true);
    this._vm.isLoading = (p.finalScore > (this._cachedScore ?? 0));
  }

  // ─── Client: hide on restart ──────────────────────────────────────────────

  @subscribe(Events.GameStartRequested)
  onGameStartRequested(_p: Events.GameStartRequestedPayload): void {
    if (this._isServer) return;
    this._setVisibility(false);
  }

  // ─── Server: update entry + fetch top → send results back ────────────────
  @subscribe(NetworkEvents.SubmitScore, { execution: ExecuteOn.Everywhere })
  async onSubmitScore(p: NetworkEvents.SubmitScorePayload): Promise<void> {
    if (!this._isServer)
    {
      if ((this._cachedScore ?? 0) < p.score)
      {
        this._cachedScore = p.score;
        this._updateClient();
      }
      return;
    }
    console.log(`[LB][S] onSubmitScore — score=${p.score} cachedScore=${this._cachedScore ?? 'unknown'}`);
    if (this._cachedScore !== undefined && p.score <= this._cachedScore) {
      console.log('[LB][S] onSubmitScore — skip, not a new high score');
      return;
    }
    const player    = PlayerService.get().getAllPlayers()[0];
    if (!player) return;

    if (this._cachedScore === undefined)
    {
      // _fetchForPlayer failed (network error / rate limit at start) — cachedScore is unknown.
      // Verify live before writing: updateEntryForPlayer overwrites unconditionally.
      console.log('[LB][S] onSubmitScore — cachedScore unknown, fetching live entry');
      const current = await this.lbService.fetchEntryForPlayer(player, this.leaderboardApiName).catch((e) => {
        console.error('[LB][S] onSubmitScore — live fetch error', e);
        return null;
      });
      if (current === null) {
        console.warn('[LB][S] onSubmitScore — live fetch failed, aborting to avoid overwrite');
        return;
      }
      this._cachedScore = current?.score ?? 0;
      console.log(`[LB][S] onSubmitScore — live score=${this._cachedScore}`);
      if (p.score <= this._cachedScore) {
        console.log('[LB][S] onSubmitScore — skip after live check, not a new high score');
        return;
      }
    }
    console.log(`[LB][S] onSubmitScore — updating entry score=${p.score}`);
    const updated = await this.lbService.updateEntryForPlayer(player, this.leaderboardApiName, p.score, {})
        .catch((e) => { console.error('[LB][S] onSubmitScore — update error', e); return null; });
    this._cachedScore = p.score;
    const newRank     = updated?.rank ?? 0;
    console.log(`[LB][S] onSubmitScore — done newRank=${newRank} prevRank=${this._cachedRank ?? 'none'}`);
    EventService.sendGlobally(NetworkEvents.LeaderboardPlayerData, {
      yourRank:      newRank,
      yourBestScore: p.score,
    });
    // Refresh top entries only if the player moved within (or into) the visible board
    if (newRank > 0 && newRank <= MAX_ENTRIES && newRank !== this._cachedRank) {
      console.log('[LB][S] onSubmitScore — rank changed in top 10, refreshing top entries');
      void this._fetchTopEntries();
    }
    this._cachedRank  = newRank;
  }

  // ─── Client: receive fresh results → update ViewModel + cache ────────────
  @subscribe(NetworkEvents.LeaderboardData, { execution: ExecuteOn.Owner })
  onLeaderboardData(p: NetworkEvents.LeaderboardDataPayload): void {
    if (this._isServer) return;

    console.log(`[LB][C] onLeaderboardData — ${p.playerNames.length} entries`);
    const alias = PlayerService.get().getLocalPlayer()?.getComponent(BasePlayerComponent)?.displayName ?? '';
    this._vm.entries = p.playerNames.map((name, i) => {
      const row           = new LeaderboardRowData();
      row.rank            = p.playerRanks[i];
      row.playerName      = name;
      row.score           = p.playerScores[i];
      row.rankDisplay     = this._formatRank(p.playerRanks[i]);
      row.isCurrentPlayer = alias !== '' && name === alias;
      return row;
    });
  }

  @subscribe(NetworkEvents.LeaderboardPlayerData, { execution: ExecuteOn.Owner })
  onLeaderboardPlayerData(p: NetworkEvents.LeaderboardPlayerDataPayload): void {
    if (this._isServer) return;

    const prevRank    = this._cachedRank;
    this._cachedScore = p.yourBestScore;
    this._cachedRank  = p.yourRank;
    this._vm.isLoading = false;
    console.log(`[LB][C] onLeaderboardPlayerData — score=${p.yourBestScore} rank=${p.yourRank} prevRank=${prevRank ?? 'none'}`);

    // Optimistic reorder: player entered or moved within top 10
    if (p.yourRank > 0 && p.yourRank <= MAX_ENTRIES && p.yourRank !== prevRank) {
      console.log('[LB][C] onLeaderboardPlayerData — optimistic reorder');
      this._reorderEntriesOptimistically(p.yourBestScore, p.yourRank);
    }

    this._updateClient();
  }

  private _reorderEntriesOptimistically(newScore: number, newRank: number): void {
    const alias   = PlayerService.get().getLocalPlayer()?.getComponent(BasePlayerComponent)?.displayName ?? '';
    const entries = [...this._vm.entries];

    // Remove the player's existing row if present
    const existing = entries.findIndex(r => r.playerName === alias && alias !== '');
    if (existing !== -1) entries.splice(existing, 1);

    // Build the new player row
    const row            = new LeaderboardRowData();
    row.rank             = newRank;
    row.playerName       = alias;
    row.score            = newScore;
    row.rankDisplay      = this._formatRank(newRank);
    row.isCurrentPlayer  = true;

    // Insert at the correct position (rank is 1-based)
    entries.splice(newRank - 1, 0, row);

    // Keep only MAX_ENTRIES rows
    this._vm.entries = entries.slice(0, MAX_ENTRIES);
  }

  private _updateClient()
  {
    if (this._isServer) return;
    const alias = PlayerService.get().getLocalPlayer()?.getComponent(BasePlayerComponent)?.displayName ?? '';
    this._vm.yourRank        = this._cachedRank ?? 0;
    this._vm.yourRankDisplay = this._formatRank(this._cachedRank ?? 0);
    for (const row of this._vm.entries) {
      row.isCurrentPlayer = alias !== '' && row.playerName === alias;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private _setVisibility(visible: boolean): void {
    this._vm.isVisible = visible;
    if (this._customUi) this._customUi.isVisible = visible;
  }

  private _placeholderEntries(): LeaderboardRowData[] {
    return Array.from({ length: 5 }, (_, i) => {
      const row       = new LeaderboardRowData();
      row.rank        = i + 1;
      row.playerName  = '---';
      row.score       = 0;
      row.rankDisplay = this._formatRank(i + 1);
      return row;
    });
  }

  private _formatRank(rank: number | undefined): string {
    if (rank === undefined || rank <= 0) return '--';
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `${rank}th`;
  }
}
