/**
 * ActionDefs — Static catalog of all player-facing actions.
 *
 * Each entry defines display data, base cost, scaling, and unlock conditions.
 * Runtime state (brackets, effects) lives in the owning service.
 *
 * costPow  — base of the exponential cost formula: cost × costPow^level. Default 2.
 * maxCount — max purchases: 1 = one-time (default), 0 = unlimited.
 *
 * unlock keys:
 *   'gold'                  — current gold on hand (ResourceService) — use for "appears when affordable"
 *   'gold_earned'           — cumulative gold earned (StatsService)  — use for mid/late objectives
 *   'taps'                  — total player taps (StatsService)
 *   'generator.N'           — units of generator N purchased (StatsService)
 *   '<action.id>'           — times that action was triggered / purchased (StatsService)
 *   'crit.proc'             — times a crit multiplier applied (CritService)
 *   'frenzy.activated'      — times frenzy was triggered (FrenzyService)
 *   'vault.lock'            — times vault was locked (VaultService)
 *   'interest.payout'       — times interest was paid out (InterestService)
 */

import { StatsService } from "../Services/StatsService";

export interface IActionDef {
  readonly id          : string;
  readonly label       : string;
  readonly description : string;
  readonly cost        : number;
  readonly costPow    ?: number;   // exponential scaling base (default 2)
  readonly maxCount   ?: number;   // 1 = one-time (default), 0 = unlimited
  readonly unlock     ?: Readonly<Record<string, number>>;
}

// ─── TapService ───────────────────────────────────────────────────────────────
//
//  Early game — buttons appear when affordable ('gold' key = current stock)
//  tap.buy:     cursor is a passive auto-clicker, slightly stronger than farm
//               because it participates in frenzy. Appears just after first farm.
//  tap.upgrade: rewards active tapping behavior, unlocks after 75 taps.

//                           id               label                    description                                 cost   costPow  maxCount  unlock
export const TAP_DEFS: IActionDef[] = [
  { id: 'tap.buy',      label: 'Buy Cursor',       description: 'Auto-clicks for you.',           cost:   50, maxCount: 10, unlock: { 'generator.0': 1, 'taps':       50 } },
  { id: 'tap.upgrade',  label: 'Reinforced Finger', description: 'Boosts the value of each tap.', cost:  100,               maxCount: 0, unlock: { 'taps':       75 } },
];

// ─── GeneratorService ─────────────────────────────────────────────────────────
//
//  Farm:  first feature — appears when affordable ('gold: 50').
//  Mine:  mid-game objective — visible after 1st farm, costs much more.

//                             id                              label                        description                                      cost         maxCount  unlock
const GENERATOR_DEFS: IActionDef[] = [
  { id: 'generator.buy.0',       label: 'Buy Farm',            description: 'Grows gold-bearing crops.',                   cost:          15, costPow: 1.15, maxCount: 0, unlock: { 'gold':           15 } },
  { id: 'generator.buy.1',       label: 'Buy Mine',            description: 'Extracts gold from deep underground.',        cost:       1_100, costPow: 1.15, maxCount: 0, unlock: { 'generator.0':   10 } },

  // Farm upgrades (one-time — maxCount: 1 by default)
  { id: 'generator.upgrade.0.0', label: 'Farm Training I',        description: 'Farms are twice as efficient.',           cost:       1_500, unlock: { 'generator.0':    3 } },
  { id: 'generator.upgrade.0.1', label: 'Farm Training II',       description: 'Farms produce even more gold.',           cost:      5_000, unlock: { 'generator.upgrade.0.0':   1 } },
  { id: 'generator.upgrade.0.2', label: 'Farm Optimization I',    description: 'Advanced techniques improve Farm output.',cost:      20_000, unlock: { 'generator.upgrade.0.1':   1 } },
  { id: 'generator.upgrade.0.3', label: 'Farm Optimization II',   description: 'Farms reach peak performance.',           cost:     50_000, unlock: { 'generator.upgrade.0.2': 1 } },
  { id: 'generator.upgrade.0.4', label: 'Farm Mastery I',         description: 'Master-level Farm efficiency unlocked.',  cost:     320_000, unlock: { 'generator.upgrade.0.3': 1 } },
  { id: 'generator.upgrade.0.5', label: 'Farm Mastery II',        description: 'Farms operate with unmatched precision.', cost:   1_280_000, unlock: { 'generator.upgrade.0.4': 1 } },
  { id: 'generator.upgrade.0.6', label: 'Farm Prestige I',        description: 'Elite Farms far surpass their peers.',    cost:  5_120_000, unlock: { 'generator.upgrade.0.5': 1 } },
  { id: 'generator.upgrade.0.7', label: 'Farm Prestige II',       description: 'Farms achieve legendary status.',         cost:  20_480_000, unlock: { 'generator.upgrade.0.6': 1 } },
  { id: 'generator.upgrade.0.8', label: 'Farm Transcendence I',   description: 'Farms transcend normal limits.',          cost:  80_420_000, unlock: { 'generator.upgrade.0.7': 1 } },
  { id: 'generator.upgrade.0.9', label: 'Farm Transcendence II',  description: 'Farms reach their ultimate form.',        cost: 325_180_000, unlock: { 'generator.upgrade.0.8': 1 } },

  // Mine upgrades (one-time — maxCount: 1 by default)
  { id: 'generator.upgrade.1.0', label: 'Mine Training I',        description: 'Mines are twice as efficient.',           cost:      11_000, unlock: { 'generator.1':   3 } },
  { id: 'generator.upgrade.1.1', label: 'Mine Training II',       description: 'Mines produce even more gold.',           cost:      44_000, unlock: { 'generator.upgrade.1.0': 1 } },
  { id: 'generator.upgrade.1.2', label: 'Mine Optimization I',    description: 'Advanced techniques improve Mine output.',cost:     176_000, unlock: { 'generator.upgrade.1.1': 1 } },
  { id: 'generator.upgrade.1.3', label: 'Mine Optimization II',   description: 'Mines reach peak performance.',           cost:     704_000, unlock: { 'generator.upgrade.1.2': 1 } },
  { id: 'generator.upgrade.1.4', label: 'Mine Mastery I',         description: 'Master-level Mine efficiency unlocked.',  cost:   2_816_000, unlock: { 'generator.upgrade.1.3': 1 } },
  { id: 'generator.upgrade.1.5', label: 'Mine Mastery II',        description: 'Mines operate with unmatched precision.', cost:  11_264_000, unlock: { 'generator.upgrade.1.4': 1 } },
  { id: 'generator.upgrade.1.6', label: 'Mine Prestige I',        description: 'Elite Mines far surpass their peers.',    cost:  45_056_000, unlock: { 'generator.upgrade.1.5': 1 } },
  { id: 'generator.upgrade.1.7', label: 'Mine Prestige II',       description: 'Mines achieve legendary status.',         cost: 180_224_000, unlock: { 'generator.upgrade.1.6': 1 } },
  { id: 'generator.upgrade.1.8', label: 'Mine Transcendence I',   description: 'Mines transcend normal limits.',          cost: 720_896_000, unlock: { 'generator.upgrade.1.7': 1 } },
  { id: 'generator.upgrade.1.9', label: 'Mine Transcendence II',  description: 'Mines reach their ultimate form.',        cost: 2_883_584_000, unlock: { 'generator.upgrade.1.8': 1 } },
];

// ─── CritService ──────────────────────────────────────────────────────────────
//
//  crit.unlock:  appears when player has 200g on hand — affordable immediately.
//  crit.chance:  unlocks after experiencing 10 crits — rewards using the feature.
//  crit.power:   unlocks after 30 crits — deeper engagement.

const CRIT_DEFS: IActionDef[] = [
  { id: 'crit.unlock',  label: 'Unlock Crit',    description: 'Chance to multiply any gain.',   cost:  150,              unlock: { 'gold':        150 } },
  { id: 'crit.chance',  label: 'Sharpen Aim',     description: 'Increase crit chance.',          cost:  500, maxCount: 8, unlock: { 'crit.unlock': 1, 'crit.proc':    10 } },
  { id: 'crit.power',   label: 'Critical Power',  description: 'Increase crit multiplier.',      cost:  750, maxCount: 0, unlock: { 'crit.unlock': 1, 'crit.proc':    30 } },
];

// ─── FrenzyService ────────────────────────────────────────────────────────────
//
//  frenzy.unlock:    mid-game objective — visible at 150 taps, costs 400 (not yet affordable).
//  frenzy upgrades:  reward experiencing frenzy — unlock after N activations.

const FRENZY_DEFS: IActionDef[] = [
  { id: 'frenzy.unlock',    label: 'Unlock Frenzy',   description: 'All gains boosted on tap streak.',    cost:  400,              unlock: { 'taps':              150 } },
  { id: 'frenzy.threshold', label: 'Hair Trigger',     description: 'Reduce taps needed for frenzy.',     cost:  300, maxCount: 5, unlock: { 'frenzy.unlock': 1, 'frenzy.activated':    3 } },
  { id: 'frenzy.duration',  label: 'Frenzy Duration',  description: 'Extend frenzy duration.',            cost:  400, maxCount: 10, unlock: { 'frenzy.unlock': 1, 'frenzy.activated':    5 } },
  { id: 'frenzy.power',     label: 'Frenzy Power',     description: 'Increase frenzy multiplier.',        cost:  600, maxCount: 10, unlock: { 'frenzy.unlock': 1, 'frenzy.activated':   10 } },
];

// ─── InterestService ──────────────────────────────────────────────────────────
//
//  interest.unlock:   mid-game objective — visible at 1000 earned, costs 2000.
//  interest upgrades: reward letting interest run — unlock after N payouts.

const INTEREST_DEFS: IActionDef[] = [
  { id: 'interest.unlock',   label: 'Unlock Interest',  description: 'Earn a % of gold on a timer.',    cost: 2_000,              unlock: { 'gold_earned':   1_000 } },
  { id: 'interest.rate',     label: 'Better Rates',      description: 'Increase interest rate.',         cost: 200, maxCount: 0, unlock: { 'interest.unlock': 1, 'interest.payout':   3 } },
  { id: 'interest.interval', label: 'Faster Returns',    description: 'Reduce interest interval.',       cost: 4_000, maxCount: 10, unlock: { 'interest.unlock': 1, 'interest.payout':  10 } },
];

// ─── VaultService ─────────────────────────────────────────────────────────────
//
//  vault.unlock:   late-game objective — visible at 5000 earned, costs 8000.
//  vault upgrades: reward using the vault — unlock after N locks.

const VAULT_DEFS: IActionDef[] = [
  { id: 'vault.unlock',   label: 'Unlock Vault',   description: 'Lock gold, return with bonus.',         cost: 8_000,              unlock: { 'gold_earned':   5_000 } },
  { id: 'vault.lock',     label: 'Lock Vault',      description: 'Lock 50% of gold, return with bonus.', cost:     0, maxCount: 0, unlock: { 'vault.unlock':      1 } },
  { id: 'vault.duration', label: 'Quick Lock',       description: 'Reduce vault lock duration.',          cost: 1_500, maxCount: 0, unlock: { 'vault.unlock': 1, 'vault.lock':        1 } },
  { id: 'vault.bonus',    label: 'Vault Bonus',      description: 'Increase vault return bonus.',         cost: 3_000, maxCount: 0, unlock: { 'vault.unlock': 1, 'vault.lock':        3 } },
];

// ─── Full registry ────────────────────────────────────────────────────────────

export const ACTION_DEFS: IActionDef[] = [
  ...TAP_DEFS,
  ...GENERATOR_DEFS,
  ...CRIT_DEFS,
  ...FRENZY_DEFS,
  ...INTEREST_DEFS,
  ...VAULT_DEFS,
];

/** Lookup by id — throws if not found (catches typos at dev time). */
export function getActionDef(id: string): IActionDef {
  const def = ACTION_DEFS.find(d => d.id === id);
  if (!def) throw new Error(`ActionDef not found: "${id}"`);
  return def;
}

/**
 * Scaled cost of a repeatable action at a given purchase level.
 * Uses costPow from the def (default 2). If level is omitted, reads from StatsService.
 */
export function getScaledCost(id: string, level?: number): number {
  const def = getActionDef(id);
  const lvl = level ?? StatsService.get().get(id);
  return Math.floor(def.cost * Math.pow(def.costPow ?? 2, lvl));
}
