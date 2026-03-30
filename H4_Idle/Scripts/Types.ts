/**
 * Types.ts — Single source of truth for all types, interfaces, enums, and events.
 *
 * Rules:
 *   - ZERO imports from sibling files (no circular deps)
 *   - All LocalEvent payloads: every field must have a default value
 *   - Event string IDs must be globally unique — always prefixed with 'Ev'
 */
import { LocalEvent } from 'meta/worlds';

// ─── Enums ────────────────────────────────────────────────────────────────────

/** All resource types in the game. Add new types here when expanding. */
export enum ResourceType {
  Gold = 0,
}

/** Source of a gold gain — used for VFX targeting and modifier context. */
export enum GainSource {
  Tap         = 0,
  Passive     = 1,
  Interest    = 2,
  VaultPayout = 3,
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

/** Static definition of a generator type. Registered in GeneratorDefs.ts. */
export interface IGeneratorDef {
  id            : number;
  name          : string;
  description   : string;
  baseCost      : number;        // cost of the first purchase
  costMultiplier: number;        // each purchase: cost × costMultiplier (e.g. 1.15)
  baseOutput    : number;        // gold produced per cycle per owned unit, before upgrades
  cycleTime     : number;        // seconds between production cycles
  unlockAt      : number;        // cumulative gold required to reveal in the shop
}

/** Static definition of an upgrade. Registered in UpgradeDefs.ts. */
export interface IUpgradeDef {
  id                : number;
  name              : string;
  description       : string;
  cost              : number;
  multiplier        : number;    // output multiplier applied on purchase (e.g. 2 = ×2)
  /** If set, only applies to this generator. If undefined, applies to click value. */
  targetGeneratorId ?: number;
  /** Condition to reveal this upgrade in the shop. */
  unlockCondition: { generatorId: number; count: number } | { resourceAmount: number };
}

/**
 * An action registered by a system in ActionService.
 * Everything here is display-only — the registering system owns all logic.
 */
export interface IAction {
  id       : string;
  label    : string;
  detail   : string;
  cost     : number;     // 0 = no cost shown; purely informational for UI
  isEnabled: boolean;    // if false, button is grayed out
}

/**
 * Condition used by systems to self-register their unlock threshold
 * with ProgressionService.
 */
export type UnlockCondition = () => boolean;

// ─── Events ───────────────────────────────────────────────────────────────────

export namespace Events {

  // ── Player input ─────────────────────────────────────────────────────────────
  export class PlayerTapPayload {}
  export const PlayerTap = new LocalEvent<PlayerTapPayload>('EvPlayerTap', PlayerTapPayload);

  // ── Action bus ───────────────────────────────────────────────────────────────
  /** Fired by ActionService when a registered button is tapped by the player. */
  export class ActionTriggeredPayload { id: string = ''; }
  export const ActionTriggered = new LocalEvent<ActionTriggeredPayload>('EvActionTriggered', ActionTriggeredPayload);

  /** Signal fired by ActionService whenever the registry changes (register/update/unregister). */
  export class ActionRegistryChangedPayload {}
  export const ActionRegistryChanged = new LocalEvent<ActionRegistryChangedPayload>('EvActionRegistryChanged', ActionRegistryChangedPayload);

  // ── Resources ─────────────────────────────────────────────────────────────────
  export class ResourceChangedPayload {
    type  : ResourceType = ResourceType.Gold;
    amount: number = 0;
  }
  export const ResourceChanged = new LocalEvent<ResourceChangedPayload>('EvResourceChanged', ResourceChangedPayload);

  // ── Modifier pipeline ─────────────────────────────────────────────────────────
  /** Fired after every gain is applied (post-modifiers). For tracking and VFX. */
  export class GainAppliedPayload {
    amount: number     = 0;
    source: GainSource = GainSource.Tap;
  }
  export const GainApplied = new LocalEvent<GainAppliedPayload>('EvGainApplied', GainAppliedPayload);

  // ── Generators ────────────────────────────────────────────────────────────────
  export class GeneratorChangedPayload {
    generatorId: number = 0;
    newCount   : number = 0;
    nextCost   : number = 0;
  }
  export const GeneratorChanged = new LocalEvent<GeneratorChangedPayload>('EvGeneratorChanged', GeneratorChangedPayload);

  // ── Upgrades ──────────────────────────────────────────────────────────────────
  export class UpgradePurchasedPayload { upgradeId: number = 0; }
  export const UpgradePurchased = new LocalEvent<UpgradePurchasedPayload>('EvUpgradePurchased', UpgradePurchasedPayload);

  // ── Passive tick ──────────────────────────────────────────────────────────────
  export class TickPayload { dt: number = 0; }
  export const Tick = new LocalEvent<TickPayload>('EvTick', TickPayload);

  // ── Crit ──────────────────────────────────────────────────────────────────────
  export class CritTriggeredPayload {
    rawAmount   : number     = 0;
    multiplier  : number     = 1;
    finalAmount : number     = 0;
    source      : GainSource = GainSource.Tap;
  }
  export const CritTriggered = new LocalEvent<CritTriggeredPayload>('EvCritTriggered', CritTriggeredPayload);

  // ── Frenzy ────────────────────────────────────────────────────────────────────
  export class FrenzyProgressPayload { current: number = 0; threshold: number = 1; }
  export const FrenzyProgress = new LocalEvent<FrenzyProgressPayload>('EvFrenzyProgress', FrenzyProgressPayload);

  export class FrenzyStartedPayload { duration: number = 0; multiplier: number = 1; }
  export const FrenzyStarted = new LocalEvent<FrenzyStartedPayload>('EvFrenzyStarted', FrenzyStartedPayload);

  export class FrenzyEndedPayload {}
  export const FrenzyEnded = new LocalEvent<FrenzyEndedPayload>('EvFrenzyEnded', FrenzyEndedPayload);

  // ── Interest ──────────────────────────────────────────────────────────────────
  export class InterestPaidPayload { amount: number = 0; rate: number = 0; }
  export const InterestPaid = new LocalEvent<InterestPaidPayload>('EvInterestPaid', InterestPaidPayload);

  // ── Vault ─────────────────────────────────────────────────────────────────────
  export class VaultLockedPayload { amount: number = 0; duration: number = 0; }
  export const VaultLocked = new LocalEvent<VaultLockedPayload>('EvVaultLocked', VaultLockedPayload);

  export class VaultReadyPayload { lockedAmount: number = 0; bonusMultiplier: number = 1; }
  export const VaultReady = new LocalEvent<VaultReadyPayload>('EvVaultReady', VaultReadyPayload);

  export class VaultCollectedPayload { principal: number = 0; bonus: number = 0; total: number = 0; }
  export const VaultCollected = new LocalEvent<VaultCollectedPayload>('EvVaultCollected', VaultCollectedPayload);

  // ── Progression ───────────────────────────────────────────────────────────────
  /** Fired by ProgressionService when a system's unlock condition is first met. */
  export class FeatureUnlockedPayload { featureId: string = ''; }
  export const FeatureUnlocked = new LocalEvent<FeatureUnlockedPayload>('EvFeatureUnlocked', FeatureUnlockedPayload);

  // ── Session ───────────────────────────────────────────────────────────────────
  export class RestartPayload {}
  export const Restart = new LocalEvent<RestartPayload>('EvRestart', RestartPayload);
}
