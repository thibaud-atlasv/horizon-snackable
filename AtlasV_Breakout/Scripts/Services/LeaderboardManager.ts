import {
  component,
  Component,
  EventService,
  ExecuteOn,
  LeaderboardsService,
  NetworkingService,
  OnPlayerCreateEvent,
  OnPlayerCreateEventPayload,
  PlayerService,
  subscribe,
} from 'meta/worlds';
import type { Entity, LeaderboardEntry, Maybe } from 'meta/worlds';
import { LeaderboardEvents, HighScoreHUDEvents } from '../Types';
import type { HighScoreEntry } from '../Types';

const LEADERBOARD_API_NAME = 'score';
const NUM_ENTRIES = 10;
const CENTER_OFFSET = 5;

/**
 * Submits player scores to the "score" leaderboard and fetches adjacent entries
 * for the high score display.
 *
 * Server-side: fetches leaderboard entries on player create and after score submission,
 * broadcasts results to all clients via LeaderboardEntriesFetched NetworkEvent.
 *
 * Client-side: caches received entries and displays them when GameManager requests
 * via LeaderboardDisplayRequest. Falls back to fetchEntryForPlayer if cache is empty.
 *
 * Component Attachment: Scene entity (Manager in Breakout.hstf)
 * Component Networking: Networked (scene entity, server-owned)
 * Component Ownership: Server — submission and fetchEntries run server-side;
 *   client caches and displays results, with fetchEntryForPlayer as fallback
 */
@component()
export class LeaderboardManager extends Component {
  // Client-side cache of leaderboard entries received from server
  private _cachedEntries: HighScoreEntry[] = [];
  // Whether the display has been requested (game over state)
  private _isDisplaying: boolean = false;

  // —— Server-side: pre-fetch on player join ——————————————————————————————————

  @subscribe(OnPlayerCreateEvent, { execution: ExecuteOn.Everywhere })
  async onPlayerCreate(payload: OnPlayerCreateEventPayload): Promise<void> {
    if (!NetworkingService.get().isServerContext()) return;
    if (!payload.entity) return;

    await this._serverFetchAndBroadcast(payload.entity);
  }

  // —— Server-side: submit score then re-fetch ————————————————————————————————

  @subscribe(LeaderboardEvents.LeaderboardSubmitScore, { execution: ExecuteOn.Everywhere })
  async onSubmitScore(payload: LeaderboardEvents.LeaderboardSubmitScorePayload): Promise<void> {
    if (!NetworkingService.get().isServerContext()) return;
    try {
      const players = PlayerService.get().getAllPlayers();
      if (players.length === 0) return;
      const player = players[0];
      const existingEntry = await LeaderboardsService.get().fetchEntryForPlayer(
        player,
        LEADERBOARD_API_NAME,
      );
      if (existingEntry && payload.score <= existingEntry.score) {
        return;
      }

      const result = await LeaderboardsService.get().updateEntryForPlayer(
        player,
        LEADERBOARD_API_NAME,
        payload.score,
        {},
      );
      await this._serverFetchAndBroadcast(player);
    } catch (error) {
      console.error('[LeaderboardManager] Failed to submit score:', error);
    }
  }

  // —— Server helper: fetch entries and broadcast to all clients ——————————————
  private async _serverFetchAndBroadcast(player: Entity): Promise<void> {
    try {
      // Get player's own entry to know their rank
      const myEntry: Maybe<LeaderboardEntry> = await LeaderboardsService.get().fetchEntryForPlayer(
        player,
        LEADERBOARD_API_NAME,
      );

      const myRank: number = myEntry ? myEntry.rank : -1;
      let startingRank = 0;
      if (myEntry) {
        startingRank = Math.max(0, myEntry.rank - CENTER_OFFSET);
      }

      const entries: LeaderboardEntry[] = await LeaderboardsService.get().fetchEntries(
        LEADERBOARD_API_NAME,
        { startingRank, numEntries: NUM_ENTRIES },
      );

      const highScoreEntries: HighScoreEntry[] = entries.map((entry) => ({
        rank: entry.rank,
        name: entry.playerAlias.length > 0 ? entry.playerAlias : '???',
        score: entry.score,
        isCurrentPlayer: entry.rank === myRank,
      }));

      EventService.sendGlobally(LeaderboardEvents.LeaderboardEntriesFetched, {
        entries: highScoreEntries,
        playerRank: myRank,
      });
    } catch (error) {
      console.error('[LeaderboardManager] Server fetch failed:', error);
    }
  }

  // —— Client-side: cache entries from server broadcast ———————————————————————
  @subscribe(LeaderboardEvents.LeaderboardEntriesFetched, { execution: ExecuteOn.Everywhere })
  onEntriesFetched(payload: LeaderboardEvents.LeaderboardEntriesFetchedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._cachedEntries = [...payload.entries];
    if (this._isDisplaying && this._cachedEntries.length > 0) {
      EventService.sendLocally(HighScoreHUDEvents.ShowHighScores, { entries: this._cachedEntries });
    }
  }

  // —— Client-side: display request from GameManager ——————————————————————————
  @subscribe(LeaderboardEvents.LeaderboardDisplayRequest, { execution: ExecuteOn.Everywhere })
  async onDisplayRequest(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;
    this._isDisplaying = true;
    if (this._cachedEntries.length > 0) {
      EventService.sendLocally(HighScoreHUDEvents.ShowHighScores, { entries: this._cachedEntries });
      return;
    }

    // Cache empty — fallback: try fetchEntryForPlayer (works on client)
    EventService.sendLocally(HighScoreHUDEvents.ShowHighScores, { entries: [] });
    try {
      const player = PlayerService.get().getLocalPlayer();
      if (player) {
        const myEntry: Maybe<LeaderboardEntry> = await LeaderboardsService.get().fetchEntryForPlayer(
          player,
          LEADERBOARD_API_NAME,
        );
        if (myEntry && this._isDisplaying) {
          const fallbackEntries: HighScoreEntry[] = [{
            rank: myEntry.rank,
            name: myEntry.playerAlias.length > 0 ? myEntry.playerAlias : 'YOU',
            score: myEntry.score,
            isCurrentPlayer: true,
          }];
          EventService.sendLocally(HighScoreHUDEvents.ShowHighScores, { entries: fallbackEntries });
          return;
        }
      }
    } catch (error) {
      console.error('[LeaderboardManager] Client fallback failed:', error);
    }
    if (this._isDisplaying) {
      EventService.sendLocally(HighScoreHUDEvents.ShowHighScores, { entries: [] });
    }
  }

  // —— Client-side: reset display state when high scores are hidden ————————
  @subscribe(HighScoreHUDEvents.HideHighScores, { execution: ExecuteOn.Everywhere })
  onHideHighScores(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._isDisplaying = false;
  }
}
