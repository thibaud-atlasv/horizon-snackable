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

/** One upgrade in a generator's upgrade chain. */
export interface IGeneratorUpgradeDef {
  id         : string;   // e.g. 'cursor.upgrade.1' — must be globally unique
  name       : string;
  detail     : string;
  cost       : number;
  multiplier : number;   // applied to this generator's output on purchase
  unlockCount: number;   // min owned of this generator required to reveal
}

/** Static definition of a generator type. */
export interface IGeneratorDef {
  id            : number;
  name          : string;
  description   : string;
  baseCost      : number;
  costMultiplier: number;
  baseOutput    : number;   // gold per cycle per unit, before upgrades
  cycleTime     : number;   // seconds between production cycles
  /** Condition to reveal the buy button. */
  unlockCondition: { goldEarned: number } | { generatorId: number; count: number };
  upgrades      : IGeneratorUpgradeDef[];
}

/** Static definition of a tap/click upgrade (used by TapService). */
export interface IUpgradeDef {
  id                : number;
  name              : string;
  description       : string;
  cost              : number;
  multiplier        : number;
  targetGeneratorId ?: number;
  unlockCondition   : { generatorId: number; count: number } | { resourceAmount: number };
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


// ─── Events ───────────────────────────────────────────────────────────────────

export namespace Events {

  // ── Player input ─────────────────────────────────────────────────────────────
  export class PlayerTapPayload {}
  export const PlayerTap = new LocalEvent<PlayerTapPayload>('EvPlayerTap', PlayerTapPayload);

  // ── UI Animation triggers ─────────────────────────────────────────────────
  /** Fired to trigger the tap button visual animation externally (e.g. auto-clicker). */
  export class PlayTapAnimationPayload {}
  export const PlayTapAnimation = new LocalEvent<PlayTapAnimationPayload>('EvPlayTapAnimation', PlayTapAnimationPayload);

  // ── Action bus ───────────────────────────────────────────────────────────────
  /** Fired by ActionService when a registered button is tapped by the player. */
  export class ActionTriggeredPayload { id: string = ''; }
  export const ActionTriggered = new LocalEvent<ActionTriggeredPayload>('EvActionTriggered', ActionTriggeredPayload);

  /** Signal fired by ActionService whenever the registry changes (register/update/unregister). */
  export class ActionRegistryChangedPayload {}
  export const ActionRegistryChanged = new LocalEvent<ActionRegistryChangedPayload>('EvActionRegistryChanged', ActionRegistryChangedPayload);

  // ── Stats ─────────────────────────────────────────────────────────────────────
  /** Fired whenever a stat counter is incremented. ActionService uses this to refresh declared actions. */
  export class StatsChangedPayload {}
  export const StatsChanged = new LocalEvent<StatsChangedPayload>('EvStatsChanged', StatsChangedPayload);

  // ── Resources ─────────────────────────────────────────────────────────────────
  export class ResourceChangedPayload {
    type  : ResourceType = ResourceType.Gold;
    amount: number = 0;
  }
  export const ResourceChanged = new LocalEvent<ResourceChangedPayload>('EvResourceChanged', ResourceChangedPayload);

  // ── Modifier pipeline ─────────────────────────────────────────────────────────
  /** Fired after every gain is applied (post-modifiers). For tracking and VFX. */
  export class GainAppliedPayload {
    amount  : number     = 0;
    source  : GainSource = GainSource.Tap;
    isCrit  : boolean    = false;
    isFrenzy: boolean    = false;
  }
  export const GainApplied = new LocalEvent<GainAppliedPayload>('EvGainApplied', GainAppliedPayload);

  // ── Passive tick ──────────────────────────────────────────────────────────────
  export class TickPayload { dt: number = 0; }
  export const Tick = new LocalEvent<TickPayload>('EvTick', TickPayload);

}
