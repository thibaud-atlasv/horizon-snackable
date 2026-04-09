import { LocalEvent } from 'meta/worlds';

// ── Shot Fired (ball just kicked — dots should update immediately) ───────────

export class ShotFiredPayload {
  shotsLeft: number = 0;
}

export const ShotFiredEvent = new LocalEvent<ShotFiredPayload>(
  'EvShotFired',
  ShotFiredPayload,
);

// ── Phase Changed ────────────────────────────────────────────────────────────

export class PhaseChangedPayload {
  phase: number = 0;
}

export const PhaseChangedEvent = new LocalEvent<PhaseChangedPayload>(
  'EvPhaseChanged',
  PhaseChangedPayload,
);

// ── Score Changed ────────────────────────────────────────────────────────────

export class ScoreChangedPayload {
  score: number = 0;
  comboMulti: number = 1;
}

export const ScoreChangedEvent = new LocalEvent<ScoreChangedPayload>(
  'EvScoreChanged',
  ScoreChangedPayload,
);

// ── Game Reset (new round started) ───────────────────────────────────────────

export class GameResetPayload {
  shotsLeft: number = 0;
}

export const GameResetEvent = new LocalEvent<GameResetPayload>(
  'EvGameReset',
  GameResetPayload,
);
