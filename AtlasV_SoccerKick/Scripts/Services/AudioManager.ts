/**
 * AudioManager — Routes gameplay events to SoundComponents.
 *
 * Setup:
 *   1. Create a scene entity with a SoundComponent (asset assigned, autoStart=false).
 *   2. Add an AudioSource component and set soundId to one of the SFX constants below.
 *   3. Sounds are triggered automatically from gameplay events.
 */
import { Service, service, subscribe, SoundComponent, Vec2 } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { ShotFeedbackResultEvent } from '../Events/ShotFeedbackEvents';
import { PhaseChangedEvent, GameResetEvent, ScoreChangedEvent } from '../Events/GameEvents';
import { GamePhase, ShotOutcome } from '../Types';
import type { ShotFeedbackResultPayload } from '../Events/ShotFeedbackEvents';
import type { PhaseChangedPayload, GameResetPayload, ScoreChangedPayload } from '../Events/GameEvents';

// ── Sound IDs — use these in the AudioSource component's soundId field ────────

export const SFX = {
  // Kick
  KICK:             'Kick',           // ball kicked

  // Ball flight
  BALL_WHOOSH:      'BallWhoosh',         // ball in flight (short)
  BALL_HIT_POST:    'BallHit',            // hit the post or crossbar

  // Outcomes
  GOAL:             'sfx_goal',           // ball crosses the line
  LOOSE:            'sfx_lose',           
  WIN:              'sfx_win',           
  GOAL_CORNER:      'sfx_goal_corner',    // corner / lucarne bonus
  GOAL_CHIP:        'sfx_goal_chip',      // chip bonus
  SAVE:             'GoalSave',           // goalkeeper saves
  MISS:             'Miss',           // ball misses the frame

  // Combo
  COMBO_2:          'Combo2',        // 2-goal streak
  COMBO_3:          'Combo3',        // 3-goal streak
  COMBO_5:          'Combo5',        // 5+ streak

  // Game state
  GAME_START:       'sfx_game_start',     // new game begins (GameResetEvent)
  GAME_OVER:        'sfx_game_over',      // GameOver phase reached
} as const;

export type SoundId = typeof SFX[keyof typeof SFX];

// ── AudioManager ─────────────────────────────────────────────────────────────

@service()
export class AudioManager extends Service {

  private readonly _sounds     = new Map<string, SoundComponent[]>();
  private readonly _soundIndex = new Map<string, number>();

  // ── Registration ─────────────────────────────────────────────────────────────

  /** Called by AudioSource component on start. */
  register(soundId: string, entity: Entity): void {
    const sound = entity.getComponent(SoundComponent);
    if (!sound) {
      console.error(`[AudioManager] register("${soundId}") — no SoundComponent on entity`);
      return;
    }
    if (!this._sounds.has(soundId)) {
      this._sounds.set(soundId, []);
      this._soundIndex.set(soundId, 0);
    }
    this._sounds.get(soundId)!.push(sound);
    this._play(soundId, 0);
  }

  // ── Playback ─────────────────────────────────────────────────────────────────

  private _next(soundId: string): SoundComponent | undefined {
    const pool = this._sounds.get(soundId);
    if (!pool || pool.length === 0) return undefined;
    const idx = this._soundIndex.get(soundId) ?? 0;
    this._soundIndex.set(soundId, (idx + 1) % pool.length);
    return pool[idx];
  }

  private _play(soundId: string, volume: number = 1, pitch: number = 1): void {
    const sound = this._next(soundId);
    if (!sound) return;
    sound.loop = false;
    sound.playVolume = volume;
    sound.minMaxPitch = new Vec2(pitch, pitch);
    sound.play();
  }

  // ── Shot feedback ─────────────────────────────────────────────────────────────

  @subscribe(ShotFeedbackResultEvent)
  onShotResult(p: ShotFeedbackResultPayload): void {
    switch (p.outcome) {
      case ShotOutcome.Goal:
        this._play(SFX.GOAL);
        this._play(SFX.WIN);
        break;
      case ShotOutcome.Save:
        this._play(SFX.BALL_HIT_POST);
    this._play(SFX.LOOSE);
        break;
      case ShotOutcome.PostHit:
        this._play(SFX.BALL_HIT_POST);
    this._play(SFX.LOOSE);
        break;
      case ShotOutcome.Miss:
        this._play(SFX.MISS);
    this._play(SFX.LOOSE);
        break;
    }
  }

  // ── Combo ─────────────────────────────────────────────────────────────────────

  @subscribe(ScoreChangedEvent)
  onScoreChanged(p: ScoreChangedPayload): void {
    if (p.combo >= 5)      this._play(SFX.COMBO_5, 0.2);
    else if (p.combo >= 3) this._play(SFX.COMBO_3, 0.2);
    else if (p.combo >= 2) this._play(SFX.COMBO_2, 0.2);
  }

  // ── Game state ────────────────────────────────────────────────────────────────

  @subscribe(GameResetEvent)
  onGameReset(_p: GameResetPayload): void {
    this._play(SFX.GAME_START);
  }

  @subscribe(PhaseChangedEvent)
  onPhaseChanged(p: PhaseChangedPayload): void {
    if (p.phase === GamePhase.GameOver)
      {
        this._play(SFX.GAME_OVER);
        setTimeout(() => this._play("sfx_ui"), 1000);
        
      }
    if (p.phase === GamePhase.Flying)   this._play(SFX.KICK);
  }
}
