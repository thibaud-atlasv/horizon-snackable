import { LocalEvent } from "meta/worlds";

// ─── Primitive Types ──────────────────────────────────────────────────────────

export type RGB = [r: number, g: number, b: number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ICollider {
  readonly colliderTag: string;
  getColliderBounds(): Rect;
  onCollision(other: ICollider): void;
}

// ─── Game Enums ───────────────────────────────────────────────────────────────

export enum GamePhase {
  Start    = 0,
  Intro    = 1,
  Falling  = 2,
  Clearing = 3,
  RoundEnd = 4,
  GameOver = 5,
  End      = 6,
}

export enum ScoreGrade {
  Perfect = 0,
  Great   = 1,
  Good    = 2,
  Early   = 3,
  Miss    = 4,
}

/** Identifies the type of falling object. Add new types here to support new object variants. */
export enum FallingObjType {
  Log  = 0,
  Ball = 1,
}

// ─── Falling Object Interface ─────────────────────────────────────────────────
// Contract used by FallingObjRegistry and InputManager.
// Never hold a direct component reference — communicate through events only.

export interface IFallingObj {
  readonly objId:   number;
  readonly objType: FallingObjType;

  waiting(): boolean;
  /** Minimum Y (world space, Y-up) of the object's bounding volume. */
  getLowestY(): number;
}

// ─── Events ───────────────────────────────────────────────────────────────────
// All payload fields MUST have default values.
// Event string IDs are globally unique; always prefix with 'Ev'.

export namespace Events {

  // ── Phase ──────────────────────────────────────────────────────────────────
  export class PhaseChangedPayload {
    readonly phase: GamePhase = GamePhase.Start;
  }
  export const PhaseChanged = new LocalEvent<PhaseChangedPayload>('EvPhaseChanged', PhaseChangedPayload);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  export class RestartPayload {}
  export const Restart = new LocalEvent<RestartPayload>('EvRestart', RestartPayload);

  export class PrepareRoundPayload {
    readonly roundIndex: number = 0;
  }
  export const PrepareRound = new LocalEvent<PrepareRoundPayload>('EvPrepareRound', PrepareRoundPayload);

  // ── Object init (SpawnManager → FallingObj) ───────────────────────────────
  // SpawnManager awaits each spawn then sends this to the newly-spawned entity.
  export class InitFallingObjPayload {
    readonly objId:      number         = 0;
    readonly objType:    FallingObjType = FallingObjType.Log;
    readonly cx:         number         = 0;
    readonly startY:     number         = 0;
    readonly ghost:      boolean        = false;
    // Log-type physics (ignored for other types)
    readonly angle:      number         = 0;
    readonly torque:     number         = 0;
    readonly pivotShift: number         = 0;
    readonly logW:       number         = 1;
    readonly speed:      number         = 3;
    readonly vx:         number         = 0;
    readonly bounce:     boolean        = false;
    readonly colorIdx:   number         = 0;
    // Ball-type physics (ignored for other types)
    readonly ballRadius: number         = 0.5;
    readonly ballVx:     number         = 0;    // initial horizontal velocity (wu/s)
    readonly ballVy:     number         = 0;    // initial vertical velocity (wu/s, negative = downward)
    readonly ballAy:     number         = -9.8; // gravity acceleration (wu/s²)
  }
  export const InitFallingObj = new LocalEvent<InitFallingObjPayload>('EvInitFallingObj', InitFallingObjPayload);

  // ── Object activation (SpawnManager → FallingObj, starts the fall) ────────
  export class FallingObjActivatePayload {
    readonly objId: number = 0;
  }
  export const FallingObjActivate = new LocalEvent<FallingObjActivatePayload>('EvFallingObjActivate', FallingObjActivatePayload);

  // ── Object events (FallingObj → world) ────────────────────────────────────
  export class FallingObjHitFloorPayload {}
  export const FallingObjHitFloor = new LocalEvent<FallingObjHitFloorPayload>('EvFallingObjHitFloor', FallingObjHitFloorPayload);

  export class FallingObjFreezePayload {
    readonly objId: number = 0;
  }
  export const FallingObjFreeze = new LocalEvent<FallingObjFreezePayload>('EvFallingObjFreeze', FallingObjFreezePayload);

  export class FallingObjFrozenPayload {
    readonly objId:   number     = 0;
    readonly pts:     number     = 0;
    readonly grade:   ScoreGrade = ScoreGrade.Miss;
    readonly lowestY: number     = 0;
  }
  export const FallingObjFrozen = new LocalEvent<FallingObjFrozenPayload>('EvFallingObjFrozen', FallingObjFrozenPayload);

  // ── Round events ──────────────────────────────────────────────────────────
  export class AllObjsSpawnedPayload {
    readonly roundIndex: number = 0;
    readonly objCount:   number = 0;
  }
  export const AllObjsSpawned = new LocalEvent<AllObjsSpawnedPayload>('EvAllObjsSpawned', AllObjsSpawnedPayload);

  export class RoundCompletePayload {
    readonly roundIndex: number = 0;
  }
  export const RoundComplete = new LocalEvent<RoundCompletePayload>('EvRoundComplete', RoundCompletePayload);

  // ── Player tap (ClientSetup → world) ──────────────────────────────────────
  export class PlayerTapPayload {}
  export const PlayerTap = new LocalEvent<PlayerTapPayload>('EvPlayerTap', PlayerTapPayload);
}

// ─── HUD Events ───────────────────────────────────────────────────────────────

export namespace HUDEvents {

  export class UpdateScorePayload {
    readonly score: number = 0;
  }
  export const UpdateScore = new LocalEvent<UpdateScorePayload>('EvHUDUpdateScore', UpdateScorePayload);

  export class ShowMessagePayload {
    readonly message: string = '';
  }
  export const ShowMessage = new LocalEvent<ShowMessagePayload>('EvHUDShowMessage', ShowMessagePayload);

  export class HideMessagePayload {}
  export const HideMessage = new LocalEvent<HideMessagePayload>('EvHUDHideMessage', HideMessagePayload);

  export class ShowGradePayload {
    readonly grade:  ScoreGrade = ScoreGrade.Miss;
    readonly pts:    number     = 0;
    readonly worldY: number     = 0;
  }
  export const ShowGrade = new LocalEvent<ShowGradePayload>('EvHUDShowGrade', ShowGradePayload);

  export class UpdateRoundPayload {
    readonly round:    number = 1;
    readonly objCount: number = 1;
  }
  export const UpdateRound = new LocalEvent<UpdateRoundPayload>('EvHUDUpdateRound', UpdateRoundPayload);
}
