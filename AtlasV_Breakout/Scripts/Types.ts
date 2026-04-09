import { Color, LocalEvent, NetworkEvent, serializable, Vec3, type Entity } from "meta/worlds";

export type RGB = [r: number, g: number, b: number];

/**
 * Colors keyed by remaining HP + indestructible state.
 * Ex: { 3: [1,0,0], 2: [0.5,0,0], 1: [0.2,0,0], indestructible: [0.5,0.5,0.5] }
 */
export type BrickColorPalette = Partial<Record<number, RGB>> & { indestructible?: RGB };

export interface Rect {
  x: number;   // min x / left edge (world space)
  y: number;   // min y / bottom edge (world space)
  w: number;   // full width
  h: number;   // full height
}

export interface ICollider {
  readonly colliderTag: string;
  getColliderBounds(): Rect;
  onCollision(other: ICollider): void;
}

/**
 * Extended contract for brick-tagged colliders.
 * Implement this on any brick component to participate in explosion chains
 * and other external destruction triggers without instanceof checks.
 */
export interface IBrick extends ICollider {
  triggerDestruction(): void;
}

export enum PowerUpType {
  BigPaddle = 0,
  StickyPaddle = 1,
}

export namespace Events
{
  export class RestartPayload {}
  export const Restart = new LocalEvent<RestartPayload>('EvRestart', RestartPayload);

  export class ResetRoundPayload {}
  export const ResetRound = new LocalEvent<ResetRoundPayload>('EvResetRound', ResetRoundPayload);

  export class BallLostPayload {}
  export const BallLost = new LocalEvent<BallLostPayload>('EvBallLost', BallLostPayload);

  export class BrickDestroyedPayload {
    readonly position: Vec3 = Vec3.zero;
    readonly color: Color = Color.white;
  }
  export const BrickDestroyed = new LocalEvent<BrickDestroyedPayload>('EvBrickDestroyed', BrickDestroyedPayload);

  export class PowerUpCollectedPayload {
    readonly powerUpType: PowerUpType = PowerUpType.BigPaddle;
    readonly duration: number = 10;
  }
  export const PowerUpCollected = new LocalEvent<PowerUpCollectedPayload>('EvPowerUpCollected', PowerUpCollectedPayload);

  export class StickyPaddleActivatedPayload {}
  export const StickyPaddleActivated = new LocalEvent<StickyPaddleActivatedPayload>('EvStickyPaddleActivated', StickyPaddleActivatedPayload);

  export class StickyPaddleDeactivatedPayload {}
  export const StickyPaddleDeactivated = new LocalEvent<StickyPaddleDeactivatedPayload>('EvStickyPaddleDeactivated', StickyPaddleDeactivatedPayload);

  export class ReleaseBallPayload {}
  export const ReleaseBall = new LocalEvent<ReleaseBallPayload>('EvReleaseBall', ReleaseBallPayload);

  export class LoadLevelPayload {
    readonly levelIndex: number = 0;
  }
  export const LoadLevel = new LocalEvent<LoadLevelPayload>('EvLoadLevel', LoadLevelPayload);

  export class InitBrickPayload {
    readonly hits: number = 1;
    readonly indestructible: boolean = false;
    readonly colors: BrickColorPalette | undefined = undefined;
  }
  export const InitBrick = new LocalEvent<InitBrickPayload>('EvInitBrick', InitBrickPayload);
}

/**
 * HUD-related events and payloads.
 * Other systems dispatch these events; the GameHUDViewModel subscribes to update the UI.
 */
export namespace HUDEvents {
  export class UpdateScorePayload {
    readonly score: number = 0;
  }
  export const UpdateScore = new LocalEvent<UpdateScorePayload>('EvHUDUpdateScore', UpdateScorePayload);

  export class UpdateLevelPayload {
    readonly level: number = 1;
  }
  export const UpdateLevel = new LocalEvent<UpdateLevelPayload>('EvHUDUpdateLevel', UpdateLevelPayload);

  export class UpdateLivesPayload {
    readonly lives: number = 3;
  }
  export const UpdateLives = new LocalEvent<UpdateLivesPayload>('EvHUDUpdateLives', UpdateLivesPayload);

  export class ShowMessagePayload {
    readonly message: string = '';
  }
  export const ShowMessage = new LocalEvent<ShowMessagePayload>('EvHUDShowMessage', ShowMessagePayload);

  export class HideMessagePayload {}
  export const HideMessage = new LocalEvent<HideMessagePayload>('EvHUDHideMessage', HideMessagePayload);
}
