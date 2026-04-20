import { LocalEvent, NetworkEvent, serializable } from 'meta/worlds';

// ─── Interfaces ───────────────────────────────────────────────────────────────

// typeKey is a key of SHAPE_TEXTURE_MAP (see Assets.ts / Defs/ShapeDefs.ts).
// Typed as string here so Types.ts stays import-free.

export interface IShapeInstance {
  typeKey:  string;
  rotation: number;  // radians
  x:        number;  // canvas-space px
  y:        number;  // canvas-space px
  size:     number;  // radius px
}

export interface IOption {
  typeKey: string;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export namespace Events {

  // UI fires this when player presses Play / Replay
  export class GameStartRequestedPayload {}
  export const GameStartRequested = new LocalEvent<GameStartRequestedPayload>(
    'EvGameStartRequested', GameStartRequestedPayload,
  );

  // GameStateService fires this after resetting all state
  export class GameStartedPayload {}
  export const GameStarted = new LocalEvent<GameStartedPayload>(
    'EvGameStarted', GameStartedPayload,
  );

  // RoundService fires this when a new round is ready
  export class RoundStartedPayload {
    round:        number           = 0;
    shapes:       IShapeInstance[] = [];
    options:      IOption[]        = [];
    correctIndex: number           = 0;
  }
  export const RoundStarted = new LocalEvent<RoundStartedPayload>(
    'EvRoundStarted', RoundStartedPayload,
  );

  // UI fires this when player taps an option button
  export class AnswerSubmittedPayload {
    optionIndex: number = 0;
  }
  export const AnswerSubmitted = new LocalEvent<AnswerSubmittedPayload>(
    'EvAnswerSubmitted', AnswerSubmittedPayload,
  );

  // GameStateService fires this after validating an answer (or a timeout)
  export class AnswerResultPayload {
    correct:      boolean = false;
    timeout:      boolean = false;  // true when time ran out (no option tapped)
    correctIndex: number  = 0;
    wrongIndex:   number  = -1;     // -1 when correct or timeout
    pointsEarned: number  = 0;
    newScore:     number  = 0;
  }
  export const AnswerResult = new LocalEvent<AnswerResultPayload>(
    'EvAnswerResult', AnswerResultPayload,
  );

  // TimerService fires every frame while a round is active (pct: 1 → 0)
  export class TimerTickPayload {
    pct: number = 1;
  }
  export const TimerTick = new LocalEvent<TimerTickPayload>(
    'EvTimerTick', TimerTickPayload,
  );

  // TimerService fires when pct reaches 0
  export class TimerExpiredPayload {}
  export const TimerExpired = new LocalEvent<TimerExpiredPayload>(
    'EvTimerExpired', TimerExpiredPayload,
  );

  // Internal: GameStateService fires this after the correct-answer delay
  export class NextRoundRequestedPayload {}
  export const NextRoundRequested = new LocalEvent<NextRoundRequestedPayload>(
    'EvNextRoundRequested', NextRoundRequestedPayload,
  );

  // GameStateService fires this when the game ends
  export class GameOverPayload {
    finalScore: number = 0;
  }
  export const GameOver = new LocalEvent<GameOverPayload>(
    'EvGameOver', GameOverPayload,
  );

  // GameStateService fires this when the game ends
  export class GameOverDismissPayload {
  }
  export const GameOverDismiss = new LocalEvent<GameOverDismissPayload>(
    'EvGameOverDismiss', GameOverDismissPayload,
  );
}

// ─── Network Events (client ↔ server) ────────────────────────────────────────

export namespace NetworkEvents {

  // Client → Server: submit final score to the leaderboard
  @serializable()
  export class SubmitScorePayload {
    readonly score: number = 0;
  }
  export const SubmitScore = new NetworkEvent<SubmitScorePayload>(
    'EvLbSubmitScore', SubmitScorePayload,
  );

  // Server → Client: initial leaderboard snapshot at scene start
  @serializable()
  export class LeaderboardDataPayload {
    readonly playerNames:        readonly string[] = [];
    readonly playerScores:       readonly number[] = [];
    readonly playerRanks:        readonly number[] = [];
  }
  export const LeaderboardData = new NetworkEvent<LeaderboardDataPayload>(
    'EvLeaderboardData', LeaderboardDataPayload,
  );
  // Server → Client: initial leaderboard snapshot at scene start
  @serializable()
  export class LeaderboardPlayerDataPayload {
    readonly yourBestScore:      number            = 0;
    readonly yourRank:           number            = 0;
  }
  export const LeaderboardPlayerData = new NetworkEvent<LeaderboardPlayerDataPayload>(
    'EvLeaderboardPlayerData', LeaderboardPlayerDataPayload,
  );
}
