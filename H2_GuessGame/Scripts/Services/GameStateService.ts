import { Service, service, subscribe, EventService } from 'meta/worlds';
import { Events } from '../Types';
import { RoundService } from './RoundService';
import { TimerService } from './TimerService';
import {
  ROUND_TIME_SEC,
  ROUND_TIME_MIN,
  ROUND_TIME_DECAY,
  BASE_POINTS,
  ROUND_SCORE_MULT,
  NEXT_ROUND_DELAY_MS,
  GAME_OVER_DELAY_MS,
} from '../Constants';

/**
 * Core game state machine.
 *
 * Responsibilities:
 *   - Reset state on GameStartRequested → fire GameStarted
 *   - Accept AnswerSubmitted, compute score, fire AnswerResult
 *   - Schedule NextRoundRequested (correct) or GameOver (wrong / timeout)
 *   - Handle TimerExpired as a wrong answer with timeout = true
 *
 * Does NOT:
 *   - Generate round data (RoundService)
 *   - Drive the timer (TimerService)
 *   - Render anything
 */
@service()
export class GameStateService extends Service {
  // Inject to guarantee initialization order; methods are event-driven
  private readonly _roundService = Service.inject(RoundService);
  private readonly _timerService = Service.inject(TimerService);

  private _score:        number  = 0;
  private _round:        number  = 0;
  private _roundStartMs: number  = 0;
  private _canAnswer:    boolean = false;
  private _correctIndex: number  = 0;
  gameOver:              boolean = true;

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  @subscribe(Events.GameStartRequested)
  onGameStartRequested(_p: Events.GameStartRequestedPayload): void {
    this._score     = 0;
    this._round     = 0;
    this._canAnswer = false;
    EventService.sendLocally(Events.GameStarted, {});
  }

  // ─── Round tracking ─────────────────────────────────────────────────────────

  @subscribe(Events.RoundStarted)
  onRoundStarted(p: Events.RoundStartedPayload): void {
    this._round        = p.round;
    this._correctIndex = p.correctIndex;
    this._roundStartMs = Date.now();
    this._canAnswer    = true;
    this.gameOver      = false;
  }

  // ─── Answer handling ────────────────────────────────────────────────────────

  @subscribe(Events.AnswerSubmitted)
  onAnswerSubmitted(p: Events.AnswerSubmittedPayload): void {
    if (!this._canAnswer) return;
    this._canAnswer = false;

    const responseTime = (Date.now() - this._roundStartMs) / 1000;

    if (p.optionIndex === this._correctIndex) {
      this._handleCorrect(responseTime);
    } else {
      this._handleWrong(p.optionIndex);
    }
  }

  @subscribe(Events.TimerExpired)
  onTimerExpired(_p: Events.TimerExpiredPayload): void {
    if (!this._canAnswer) return;
    this._canAnswer = false;

    EventService.sendLocally(Events.AnswerResult, {
      correct:      false,
      timeout:      true,
      correctIndex: this._correctIndex,
      wrongIndex:   -1,
      pointsEarned: 0,
      newScore:     this._score,
    });

    setTimeout(() => this._fireGameOver(), GAME_OVER_DELAY_MS);
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private _handleCorrect(responseTime: number): void {
    const roundDuration = Math.max(ROUND_TIME_MIN, ROUND_TIME_SEC - this._round * ROUND_TIME_DECAY);
    const timePct       = Math.max(0, 1 - responseTime / roundDuration);
    const roundMult     = 1 + this._round * ROUND_SCORE_MULT;
    const pts           = Math.round(BASE_POINTS * timePct * roundMult);

    this._score += pts;

    EventService.sendLocally(Events.AnswerResult, {
      correct:      true,
      timeout:      false,
      correctIndex: this._correctIndex,
      wrongIndex:   -1,
      pointsEarned: pts,
      newScore:     this._score,
    });

    setTimeout(() => {
      EventService.sendLocally(Events.NextRoundRequested, {});
    }, NEXT_ROUND_DELAY_MS);
  }

  private _handleWrong(selectedIndex: number): void {
    EventService.sendLocally(Events.AnswerResult, {
      correct:      false,
      timeout:      false,
      correctIndex: this._correctIndex,
      wrongIndex:   selectedIndex,
      pointsEarned: 0,
      newScore:     this._score,
    });
    setTimeout(() => this._fireGameOver(), GAME_OVER_DELAY_MS);
  }

  private _fireGameOver(): void {
    this.gameOver = true;
    EventService.sendLocally(Events.GameOver, { finalScore: this._score });
  }
}
