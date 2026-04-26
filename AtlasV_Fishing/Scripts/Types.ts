import { LocalEvent, NetworkEvent, TemplateAsset, serializable } from 'meta/worlds';

// ─── Game State ───────────────────────────────────────────────────────────────
export enum GamePhase {
  Idle       = 0,  // hook hanging at surface, fish swimming
  Throwing   = 5,  // hook in cast arc above water, no player input
  Diving     = 1,  // hook below water surface, swipe to steer, collects fish
  Surfacing  = 2,  // hook pulled up at speed automatically
  Launching  = 3,  // hook above surface, hooked fish fly upward (reward anim)
  Reset      = 4,  // brief pause before Idle
}

// ─── Fish ─────────────────────────────────────────────────────────────────────
export type FishRarity = 'common' | 'rare' | 'legendary';

export interface RGB { r: number; g: number; b: number; }

export interface IFishDef {
  id          : number;
  name        : string;
  rarity      : FishRarity;
  gold        : number;     // gold awarded when caught; drives burst size and text color
  template    : TemplateAsset;
  sizeMin     : number;
  sizeMax     : number;
  speedMin    : number;
  speedMax    : number;
  spawnChance : number;    // 0-1 peak chance when wave is at maximum
  depthMin   ?: number;    // world Y at which species starts appearing, absent = surface
  wave1Period : number;    // depth units per cycle, first sine
  wave1Offset : number;    // phase offset in radians, first sine
  wave2Period : number;    // depth units per cycle, second sine (use irrational ratio with wave1)
  wave2Offset : number;    // phase offset in radians, second sine
}

export interface IFishInstance {
  readonly fishId : number;
  readonly defId  : number;
  readonly worldX : number;
  readonly worldY : number;
  readonly size   : number;
  isHooked        : boolean;
  readonly isFlying : boolean;
  setPosition(x: number, y: number): void;
  /** Teleport to a visible swim slot. */
  activate(x: number, baseY: number, speedMin: number, speedMax: number, size: number): void;
  /** Teleport off-screen; FishPoolService will reclaim and re-activate later. */
  park(parkY: number): void;
}

// ─── Events ───────────────────────────────────────────────────────────────────
export namespace Events {

  export class GameStartedPayload { }
  export const GameStarted = new LocalEvent<GameStartedPayload>('EvGameStarted', GameStartedPayload);

  // ── Phase ────────────────────────────────────────────────────────────────────
  export class PhaseChangedPayload { phase: GamePhase = GamePhase.Idle; }
  export const PhaseChanged = new LocalEvent<PhaseChangedPayload>('EvPhaseChanged', PhaseChangedPayload);

  // ── Hook ─────────────────────────────────────────────────────────────────────
  export class HookMovedPayload { x: number = 0; y: number = 0; }
  export const HookMoved = new LocalEvent<HookMovedPayload>('EvHookMoved', HookMovedPayload);

  export class HookLaunchPayload { }
  export const HookLaunch = new LocalEvent<HookLaunchPayload>('EvHookLaunch', HookLaunchPayload);

  // Requests from HookController to GameManager to advance the phase
  export class RequestDivingPayload {}
  export const RequestDiving = new LocalEvent<RequestDivingPayload>('EvRequestDiving', RequestDivingPayload);

  export class RequestSurfacePayload {}
  export const RequestSurface = new LocalEvent<RequestSurfacePayload>('EvRequestSurface', RequestSurfacePayload);

  export class RequestLaunchPayload {}
  export const RequestLaunch = new LocalEvent<RequestLaunchPayload>('EvRequestLaunch', RequestLaunchPayload);

  // ── Fish lifecycle ────────────────────────────────────────────────────────────
  export class InitFishPayload { defId: number = 0; spawnX: number = 0; baseY: number = 0; speedMin: number = 0.8; speedMax: number = 2.0; size: number = 1.0; }
  export const InitFish = new LocalEvent<InitFishPayload>('EvInitFish', InitFishPayload);

  export class FishReadyPayload { fishId: number = 0; }
  export const FishReady = new LocalEvent<FishReadyPayload>('EvFishReady', FishReadyPayload);

  export class FishHookedPayload { fishId: number = 0; }
  export const FishHooked = new LocalEvent<FishHookedPayload>('EvFishHooked', FishHookedPayload);

  /** Fired for each fish that exits the top of the screen during Launching */
  export class FishCollectedPayload { fishId: number = 0; defId: number = 0; x: number = 0; y: number = 0; }
  export const FishCollected = new LocalEvent<FishCollectedPayload>('EvFishCollected', FishCollectedPayload);

  /** All launched fish have left the screen — run ends */
  export class AllFishCollectedPayload { count: number = 0; }
  export const AllFishCollected = new LocalEvent<AllFishCollectedPayload>('EvAllFishCollected', AllFishCollectedPayload);

  // ── Bubble pool ───────────────────────────────────────────────────────────────
  export class CastRequestedPayload {}
  export const CastRequested = new LocalEvent<CastRequestedPayload>('EvCastRequested', CastRequestedPayload);

  export class InitBubblePayload { x: number = 0; y: number = 0; }
  export const InitBubble = new LocalEvent<InitBubblePayload>('EvInitBubble', InitBubblePayload);

  // ── Collection & progression ─────────────────────────────────────────────────
  export class FishCaughtPayload { fishId: number = 0; defId: number = 0; }
  export const FishCaught = new LocalEvent<FishCaughtPayload>('EvFishCaught', FishCaughtPayload);

  export class ProgressLoadedPayload {
    catchDefIds : readonly number[] = [];
    catchCounts : readonly number[] = [];
    gold        : number            = 0;
    lineLevel   : number            = 0;
    hookLevel   : number            = 0;
  }
  export const ProgressLoaded = new LocalEvent<ProgressLoadedPayload>('EvProgressLoaded', ProgressLoadedPayload);

  export class GoldChangedPayload { gold: number = 0; }
  export const GoldChanged = new LocalEvent<GoldChangedPayload>('EvGoldChanged', GoldChangedPayload);

  export class UpgradesChangedPayload { lineLevel: number = 0; hookLevel: number = 0; maxDepth: number = 0; maxFish: number = 0; }
  export const UpgradesChanged = new LocalEvent<UpgradesChangedPayload>('EvUpgradesChanged', UpgradesChangedPayload);

  export class BuyUpgradePayload { upgrade: 'line' | 'hook' = 'line'; }
  export const BuyUpgrade = new LocalEvent<BuyUpgradePayload>('EvBuyUpgrade', BuyUpgradePayload);
}


export namespace HUDEvents {

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
export namespace NetworkEvents {

  @serializable()
  export class ProgressDataPayload {
    readonly catchDefIds : readonly number[] = [];
    readonly catchCounts : readonly number[] = [];
    readonly gold        : number            = 0;
    readonly lineLevel     : number            = 0;
    readonly hookLevel     : number            = 0;
  }
  export const ProgressData = new NetworkEvent<ProgressDataPayload>('EvNetProgressData', ProgressDataPayload);

  @serializable()
  export class ReportCatchPayload {
    readonly defId : number = 0;
  }
  export const ReportCatch = new NetworkEvent<ReportCatchPayload>('EvNetReportCatch', ReportCatchPayload);

  @serializable()
  export class ReportBuyUpgradePayload {
    readonly upgrade : string = '';
  }
  export const ReportBuyUpgrade = new NetworkEvent<ReportBuyUpgradePayload>('EvNetReportBuyUpgrade', ReportBuyUpgradePayload);

  @serializable()
  export class UpgradeResultPayload {
    readonly success   : boolean = false;
    readonly gold      : number  = 0;
    readonly lineLevel : number  = 0;
    readonly hookLevel : number  = 0;
  }
  export const UpgradeResult = new NetworkEvent<UpgradeResultPayload>('EvNetUpgradeResult', UpgradeResultPayload);
}
