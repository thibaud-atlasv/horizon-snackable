import {
  Component,
  EventService,
  NetworkingService,
  OnEntityStartEvent,
  component,
  subscribe,
} from 'meta/worlds';
import {
  EARLY_DIST,
  GOOD_DIST,
  GREAT_DIST,
  PERFECT_DIST,
  RESUME_DELAY_MS,
  SCORE_BONUS_MAX,
  SCORE_EARLY,
  SCORE_GOOD,
  SCORE_GREAT,
  SCORE_MISS,
  SCORE_PERFECT,
} from './Constants';
import { FallingObjRegistry } from './LogRegistry';
import { Events, GamePhase, HUDEvents, ScoreGrade } from './Types';
import { getPrecision } from './Shared/FallingObjUtils';

/**
 * InputManager — handles player tap, scores the lowest active falling object,
 * and orchestrates the brief pause before play resumes.
 */
@component()
export class InputManager extends Component {

  private _phase:        GamePhase = GamePhase.Start;
  private _resumeTimer:  ReturnType<typeof setTimeout> | null = null;
  private _frozenCount:  number = 0;
  private _spawnedCount: number = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
  }

  // ── Phase tracking ────────────────────────────────────────────────────────

  @subscribe(Events.PhaseChanged)
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    this._phase = p.phase;
  }

  @subscribe(Events.PrepareRound)
  onPrepareRound(_p: Events.PrepareRoundPayload): void {
    this._frozenCount  = 0;
    this._spawnedCount = 0;
    if (this._resumeTimer !== null) {
      clearTimeout(this._resumeTimer);
      this._resumeTimer = null;
    }
  }

  @subscribe(Events.AllObjsSpawned)
  onAllObjsSpawned(p: Events.AllObjsSpawnedPayload): void {
    this._spawnedCount = p.objCount;
  }

  @subscribe(Events.Restart)
  onRestart(): void {
    this._frozenCount  = 0;
    this._spawnedCount = 0;
    if (this._resumeTimer !== null) {
      clearTimeout(this._resumeTimer);
      this._resumeTimer = null;
    }
  }

  // ── Player tap ────────────────────────────────────────────────────────────

  @subscribe(Events.PlayerTap)
  onPlayerTap(_p: Events.PlayerTapPayload): void {
    this._handleTap();
  }

  private _handleTap(): void {
    if (this._phase !== GamePhase.Falling) return;

    const target = FallingObjRegistry.get().getLowestFallingObj();
    if (!target) return;

    EventService.sendLocally(Events.PhaseChanged, { phase: GamePhase.Clearing });

    //const precision       = target.getPrecision();
    const lowestY         = target.getLowestY();
    const { grade, pts }  = this._computeScore(getPrecision(lowestY));

    EventService.sendLocally(Events.FallingObjFreeze, { objId: target.objId });
    EventService.sendLocally(HUDEvents.ShowGrade, { grade, pts, worldY: lowestY });

    this._frozenCount++;

    this._resumeTimer = setTimeout(() => {
      this._resumeTimer = null;
      this._afterFreeze();
    }, RESUME_DELAY_MS);
  }

  private _afterFreeze(): void {
    const allFrozen = (
      this._frozenCount >= this._spawnedCount &&
      this._spawnedCount > 0 &&
      FallingObjRegistry.get().getActiveCount() === 0
    );

    if (allFrozen) {
      EventService.sendLocally(Events.PhaseChanged, { phase: GamePhase.RoundEnd });
      EventService.sendLocally(Events.RoundComplete, { roundIndex: 0 });
    } else {
      EventService.sendLocally(Events.PhaseChanged, { phase: GamePhase.Falling });
    }
  }

  // ── Scoring ───────────────────────────────────────────────────────────────

  private _computeScore(precision: number): { grade: ScoreGrade; pts: number } {
    const d     = 1 - precision;
    const bonus = Math.round(precision * SCORE_BONUS_MAX);

    if (d <= PERFECT_DIST) return { grade: ScoreGrade.Perfect, pts: SCORE_PERFECT + bonus };
    if (d <= GREAT_DIST)   return { grade: ScoreGrade.Great,   pts: SCORE_GREAT   + bonus };
    if (d <= GOOD_DIST)    return { grade: ScoreGrade.Good,    pts: SCORE_GOOD    + bonus };
    if (d <= EARLY_DIST)   return { grade: ScoreGrade.Early,   pts: SCORE_EARLY   + bonus };
    return                        { grade: ScoreGrade.Miss,    pts: SCORE_MISS    + bonus };
  }
}
