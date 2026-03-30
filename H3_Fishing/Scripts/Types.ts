import { LocalEvent, NetworkEvent, TemplateAsset, serializable } from 'meta/worlds';

// ─── Game State ───────────────────────────────────────────────────────────────
export enum GamePhase {
  Idle         = 0,  // bait hanging from rod, fish swimming
  Charging     = 1,  // player holding — gauge ping-pongs
  Falling      = 2,  // bait in flight / entering water
  HitBottom    = 3,  // bait hit floor — brief pause
  Reeling      = 4,  // fish hooked — tap to pull up
  CatchDisplay = 5,  // fish at surface — show catch screen
  Reset        = 6,  // brief pause before returning to Idle
}

// ─── Fish ─────────────────────────────────────────────────────────────────────
export type FishRarity = 'common' | 'rare' | 'legendary';

export interface RGB { r: number; g: number; b: number; }

/**
 * Core definition of a catchable entity — registered in FishDefs.ts.
 * Only contains gameplay-relevant data: identity, zone, rarity, template to spawn.
 */
export interface IFishDef {
  id       : number;
  name     : string;
  zone     : 1 | 2 | 3;
  rarity   : FishRarity;
  template : TemplateAsset;
  sizeMin  : number;
  sizeMax  : number;
  speedMin : number;
  speedMax : number;
}

/**
 * Live fish in the world — implemented by SimpleFishController (or any fish component).
 * FishRegistry holds these refs for collision detection.
 */
export interface IFishInstance {
  readonly fishId : number;
  readonly defId  : number;
  readonly worldX : number;
  readonly worldY : number;
  readonly size   : number;
  setCaught(v: boolean): void;
  setPosition(x: number, y: number): void;
}

// ─── Events ───────────────────────────────────────────────────────────────────
// Rules: Event string IDs globally unique, prefixed 'Ev'.
// Payload fields MUST have default values.

export namespace Events {

  
  export class GameStartedPayload { }
  export const GameStarted = new LocalEvent<GameStartedPayload>('EvGameStarted', GameStartedPayload);

  // ── Phase ────────────────────────────────────────────────────────────────────
  export class PhaseChangedPayload { phase: GamePhase = GamePhase.Idle; }
  export const PhaseChanged = new LocalEvent<PhaseChangedPayload>('EvPhaseChanged', PhaseChangedPayload);

  // ── Bait ─────────────────────────────────────────────────────────────────────
  export class BaitMovedPayload { x: number = 0; y: number = 0; }
  export const BaitMoved = new LocalEvent<BaitMovedPayload>('EvBaitMoved', BaitMovedPayload);

  export class BaitHitBottomPayload {}
  export const BaitHitBottom = new LocalEvent<BaitHitBottomPayload>('EvBaitHitBottom', BaitHitBottomPayload);

  // ── Fish lifecycle ────────────────────────────────────────────────────────────
  /**
   * Sent to a specific spawned fish entity to apply its def.
   * Usage: EventService.sendLocally(Events.InitFish, { defId, speedMultiplier }, { eventTarget: entity })
   */
  export class InitFishPayload { defId: number = 0; speedMultiplier: number = 1.0; spawnX: number = 0; baseY: number = 0; speedMin: number = 0.8; speedMax: number = 2.0; }
  export const InitFish = new LocalEvent<InitFishPayload>('EvInitFish', InitFishPayload);

  export class FishHookedPayload { fishId: number = 0; defId: number = 0; fishX: number = 0; fishY: number = 0; fishSize: number = 1; }
  export const FishHooked = new LocalEvent<FishHookedPayload>('EvFishHooked', FishHookedPayload);

  export class FishCaughtPayload { fishId: number = 0; defId: number = 0; }
  export const FishCaught = new LocalEvent<FishCaughtPayload>('EvFishCaught', FishCaughtPayload);

  export class CastReleasedPayload { chargeLevel: number = 0; }
  export const CastReleased = new LocalEvent<CastReleasedPayload>('EvCastReleased', CastReleasedPayload);

  export class BaitSurfacedPayload { fishId: number = 0; }
  export const BaitSurfaced = new LocalEvent<BaitSurfacedPayload>('EvBaitSurfaced', BaitSurfacedPayload);

  // ── Zone ─────────────────────────────────────────────────────────────────────
  export class ZoneUnlockedPayload { zone: number = 1; }
  export const ZoneUnlocked = new LocalEvent<ZoneUnlockedPayload>('EvZoneUnlocked', ZoneUnlockedPayload);
}

// ─── HUD Events ───────────────────────────────────────────────────────────────
export namespace HUDEvents {

  export class UpdateGaugePayload { value: number = 0; mode: string = 'cast'; }
  export const UpdateGauge = new LocalEvent<UpdateGaugePayload>('EvHUDUpdateGauge', UpdateGaugePayload);

  export class ShowCatchPayload { defId: number = 0; isNew: boolean = false; catchCount: number = 0; }
  export const ShowCatch = new LocalEvent<ShowCatchPayload>('EvHUDShowCatch', ShowCatchPayload);

  export class HideCatchPayload {}
  export const HideCatch = new LocalEvent<HideCatchPayload>('EvHUDHideCatch', HideCatchPayload);

  export class NavigateCatchPayload { direction: number = 0; }
  export const NavigateCatch = new LocalEvent<NavigateCatchPayload>('EvHUDNavigateCatch', NavigateCatchPayload);

  export class DismissCatchPayload {}
  export const DismissCatch = new LocalEvent<DismissCatchPayload>('EvHUDDismissCatch', DismissCatchPayload);

  export class UpdateProgressPayload { uniqueCaught: number = 0; }
  export const UpdateProgress = new LocalEvent<UpdateProgressPayload>('EvHUDUpdateProgress', UpdateProgressPayload);
}

// ─── Network Events (server ↔ client) ────────────────────────────────────────
// Payloads must be @serializable with readonly fields and a no-arg constructor.
export namespace NetworkEvents {

  /**
   * Server → client: full player progression loaded from PlayerVariables.
   * Arrays used because serializable payloads don't support Map/Set.
   *   catchCounts[i] = number of times species catchDefIds[i] was caught.
   */
  @serializable()
  export class ProgressDataPayload {
    readonly catchDefIds   : readonly number[] = [];
    readonly catchCounts   : readonly number[] = [];
    readonly unlockedZones : number            = 1;
  }
  export const ProgressData = new NetworkEvent<ProgressDataPayload>('EvNetProgressData', ProgressDataPayload);

  /**
   * Client → server: notify the server that the client caught a fish.
   * Server persists the updated collection.
   */
  @serializable()
  export class ReportCatchPayload {
    readonly defId : number = 0;
  }
  export const ReportCatch = new NetworkEvent<ReportCatchPayload>('EvNetReportCatch', ReportCatchPayload);
}

// ─── Local progression loaded event ──────────────────────────────────────────
export namespace Events {
  // Fired client-side once ProgressData arrives and local services are seeded.
  export class ProgressLoadedPayload {
    catchDefIds   : readonly number[] = [];
    catchCounts   : readonly number[] = [];
    unlockedZones : number            = 1;
  }
  export const ProgressLoaded = new LocalEvent<ProgressLoadedPayload>('EvProgressLoaded', ProgressLoadedPayload);
}
