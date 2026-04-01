/**
 * GeneratorDefs — Static catalog of all generator types.
 *
 * Add a generator here AND matching entries in ActionDefs.ts:
 *   - 'generator.buy.N'           for the buy button
 *   - 'generator.upgrade.N.0..9'  for the 10 upgrade milestones (use genUpgrades())
 */

export interface IGeneratorDef {
  readonly id                : number;
  readonly name              : string;   // used for display and upgrade label generation
  // ── Production ─────────────────────────────────────────────────────────────
  readonly baseOutput        : number;   // gold per cycle (before upgrade multipliers)
  readonly cycleTime         : number;   // seconds between production cycles
  // ── Economy: cost and scaling live in ActionDefs (generator.buy.N) ────────
  // ── Upgrade multipliers ────────────────────────────────────────────────────
  /** Output multiplier granted by each upgrade rank (index = rank). Must match ActionDefs entries. */
  readonly upgradeMultipliers: readonly [number, number, number, number, number, number, number, number, number, number];
}

//                           id   name      baseCost   cMul   output  cyc    upgrade multipliers per rank (rank 0..9)
export const GENERATOR_DEFS: IGeneratorDef[] = [

  // ── Tier 1 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 0, name: 'Farm',  baseOutput:  2.5, cycleTime:  5,
    upgradeMultipliers: [2, 3, 4.5, 6.75, 10.125, 15.1875, 22.78, 34.17, 51.26, 76.9] },

  // ── Tier 2 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 1, name: 'Mine',  baseOutput: 40,   cycleTime: 10,
    upgradeMultipliers: [2, 3, 4.5, 6.75, 10.125, 15.1875, 22.78, 34.17, 51.26, 76.9] },

  // Add generators below — add matching buy + upgrade entries in ActionDefs.ts.
];
