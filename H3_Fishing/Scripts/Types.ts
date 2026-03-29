import { LocalEvent, TemplateAsset } from 'meta/worlds';

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
export type FishFamily = 'Solars' | 'Corals' | 'Greens' | 'Crystals' | 'Deeps' | 'Violets' | 'Ghosts' | 'Abyssals';
export type FishRarity = 'common' | 'rare' | 'legendary';

export interface RGB { r: number; g: number; b: number; }

/**
 * Core definition of a catchable entity — registered in FishDefs.ts (or any def file).
 * Only contains gameplay-relevant data: identity, depth, rarity, template to spawn.
 * Visual and behavioral specifics live in the component attached to the template.
 */
export interface IFishDef {
  id           : number;
  name         : string;
  family       : FishFamily;
  /** 0 = surface, 7 = sand */
  waterLayerMin: number;
  waterLayerMax: number;
  rarity       : FishRarity;
  /** Template spawned for this def — determines which component handles it. */
  template     : TemplateAsset;
}

/**
 * Live fish in the world — implemented by SimpleFishController (or any fish component).
 * FishRegistry holds these refs for collision detection.
 */
export interface IFishInstance {
  readonly fishId : number;
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

  // ── Phase ────────────────────────────────────────────────────────────────────
  export class PhaseChangedPayload { phase: GamePhase = GamePhase.Idle; }
  export const PhaseChanged = new LocalEvent<PhaseChangedPayload>('EvPhaseChanged', PhaseChangedPayload);

  export class RestartPayload {}
  export const Restart = new LocalEvent<RestartPayload>('EvRestart', RestartPayload);

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
  export class InitFishPayload { defId: number = 0; speedMultiplier: number = 1.0; spawnX: number = 0; baseY: number = 0; }
  export const InitFish = new LocalEvent<InitFishPayload>('EvInitFish', InitFishPayload);

  export class FishHookedPayload { fishId: number = 0; fishX: number = 0; fishY: number = 0; fishSize: number = 1; }
  export const FishHooked = new LocalEvent<FishHookedPayload>('EvFishHooked', FishHookedPayload);

  export class FishCaughtPayload { fishId: number = 0; }
  export const FishCaught = new LocalEvent<FishCaughtPayload>('EvFishCaught', FishCaughtPayload);

  export class CastReleasedPayload { chargeLevel: number = 0; }
  export const CastReleased = new LocalEvent<CastReleasedPayload>('EvCastReleased', CastReleasedPayload);

  export class BaitSurfacedPayload { fishId: number = 0; }
  export const BaitSurfaced = new LocalEvent<BaitSurfacedPayload>('EvBaitSurfaced', BaitSurfacedPayload);

  // ── Wave ─────────────────────────────────────────────────────────────────────
  export class WaveStartPayload { waveIndex: number = 0; speedMultiplier: number = 1.0; }
  export const WaveStart = new LocalEvent<WaveStartPayload>('EvWaveStart', WaveStartPayload);
}

// ─── HUD Events ───────────────────────────────────────────────────────────────
export namespace HUDEvents {

  export class UpdateGaugePayload { value: number = 0; mode: string = 'cast'; }
  export const UpdateGauge = new LocalEvent<UpdateGaugePayload>('EvHUDUpdateGauge', UpdateGaugePayload);

  export class ShowCatchPayload { fishId: number = 0; isNew: boolean = false; catchCount: number = 0; }
  export const ShowCatch = new LocalEvent<ShowCatchPayload>('EvHUDShowCatch', ShowCatchPayload);

  export class HideCatchPayload {}
  export const HideCatch = new LocalEvent<HideCatchPayload>('EvHUDHideCatch', HideCatchPayload);

  export class NavigateCatchPayload { direction: number = 0; }
  export const NavigateCatch = new LocalEvent<NavigateCatchPayload>('EvHUDNavigateCatch', NavigateCatchPayload);

  // Fired by a UI button to confirm and dismiss the catch display screen
  export class DismissCatchPayload {}
  export const DismissCatch = new LocalEvent<DismissCatchPayload>('EvHUDDismissCatch', DismissCatchPayload);
}

// ─── Server Events (Network) ──────────────────────────────────────────────────
// Add @serializable() + NetworkEvent here when needed.
export namespace NetworkEvents {}
