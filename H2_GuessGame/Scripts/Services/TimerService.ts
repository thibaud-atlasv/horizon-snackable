import {
  Service, service, subscribe,
  EventService,
  OnWorldUpdateEvent, ExecuteOn,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { Events } from '../Types';
import { ROUND_TIME_SEC, ROUND_TIME_MIN, ROUND_TIME_DECAY } from '../Constants';

/**
 * Drives the per-round countdown.
 *
 * Responsibilities:
 *   - Start counting when a round begins
 *   - Fire TimerTick every frame with pct in [1 → 0]
 *   - Fire TimerExpired once when pct reaches 0
 *   - Stop immediately when an answer is submitted or the game ends
 */
@service()
export class TimerService extends Service {
  private _active:   boolean = false;
  private _elapsed:  number  = 0;
  private _duration: number  = ROUND_TIME_SEC;

  @subscribe(Events.RoundStarted)
  onRoundStarted(p: Events.RoundStartedPayload): void {
    this._elapsed  = 0;
    this._duration = Math.max(ROUND_TIME_MIN, ROUND_TIME_SEC - p.round * ROUND_TIME_DECAY);
    this._active   = true;
  }

  // Stop as soon as the player answers — no stale TimerExpired can fire after this
  @subscribe(Events.AnswerSubmitted)
  onAnswerSubmitted(_p: Events.AnswerSubmittedPayload): void {
    this._active = false;
  }

  @subscribe(Events.GameOver)
  onGameOver(_p: Events.GameOverPayload): void {
    this._active = false;
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._active) return;

    this._elapsed += payload.deltaTime;
    const pct = Math.max(0, 1 - this._elapsed / this._duration);

    EventService.sendLocally(Events.TimerTick, { pct });

    if (pct <= 0) {
      this._active = false;
      EventService.sendLocally(Events.TimerExpired, {});
    }
  }
}
