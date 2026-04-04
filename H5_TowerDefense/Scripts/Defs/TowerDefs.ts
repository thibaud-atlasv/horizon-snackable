import type { ITowerDef } from '../Types';
import { Assets } from '../Assets';
import { Upg, tree } from './UpgradeDefs';

export const TOWER_DEFS: ITowerDef[] = [
  // ── Arrow ──────────────────────────────────────────────────────────────────
  // Fast single-target. Sniper reach OR lucky crits (×2, arrow-only).
  // Range path → longer reach, then rapid fire or raw power
  // Crit path  → gambler spikes, then bigger hits or faster procs
  {
    id: 'arrow', name: 'Arrow', cost: 50,
    stats: { damage: 10, range: 3.5, fireRate: 1.5, projectileSpeed: 12,
      props: { projectileColor: { r: 0.18, g: 0.80, b: 0.44 }, projectileScale: 0.10 } },
    template: Assets.Arrow,
    upgrades: tree(
      [Upg.range(50),    Upg.crit(50)],
      [[Upg.rate(75),    Upg.damage(75)],    [Upg.damage(75),   Upg.rate(75)]],
      [[Upg.damage(150), Upg.range(150)],    [Upg.rate(150),    Upg.damage(150)],
       [Upg.crit(150),   Upg.damage(150)],   [Upg.rate(150),    Upg.crit(150)]],
    ),
  },
  // ── Cannon ─────────────────────────────────────────────────────────────────
  // Slow AoE, best against groups. Raw power OR area denial.
  // Damage path → rapid heavy shells or long-reach blasts
  // Splash path → massive zone or rapid AoE
  {
    id: 'cannon', name: 'Cannon', cost: 100,
    stats: { damage: 35, range: 2.5, fireRate: 0.6, projectileSpeed: 6.5,
      props: { splashRadius: 1.0, projectileColor: { r: 0.90, g: 0.49, b: 0.13 } } },
    template: Assets.Cannon,
    upgrades: tree(
      [Upg.damage(100),  Upg.splash(100)],
      [[Upg.rate(150),   Upg.range(150)],    [Upg.damage(150),  Upg.rate(150)]],
      [[Upg.crit(300),   Upg.damage(300)],   [Upg.splash(300),  Upg.rate(300)],
       [Upg.splash(300), Upg.damage(300)],   [Upg.rate(300),    Upg.damage(300)]],
    ),
  },
  // ── Frost ──────────────────────────────────────────────────────────────────
  // Support/CC. Wide freeze zone OR deep sustained slow.
  // Splash path → broad control, then sustained or wider reach
  // Duration path → longer freeze, then more intense or wider
  {
    id: 'frost', name: 'Frost', cost: 80,
    stats: { damage: 4, range: 3.0, fireRate: 1.0, projectileSpeed: 5,
      props: { slowFactor: 0.5, slowDuration: 1.5,
               projectileColor: { r: 0.0, g: 0.74, b: 0.83 }, projectileScale: 0.12 } },
    template: Assets.Frost,
    upgrades: tree(
      [Upg.splash(80),        Upg.slowDuration(80)],
      [[Upg.slowFactor(120),  Upg.range(120)],        [Upg.rate(120),         Upg.splash(120)]],
      [[Upg.splash(240),      Upg.slowDuration(240)],  [Upg.range(240),        Upg.slowFactor(240)],
       [Upg.slowFactor(240),  Upg.splash(240)],        [Upg.slowDuration(240), Upg.range(240)]],
    ),
  },
  // ── Laser ──────────────────────────────────────────────────────────────────
  // Long-range sustained DPS. Rapid beam OR focused power.
  // Rate path → rapid fire, then heavier hits or longer reach (max 1× Range)
  // Damage path → focused beam, then speed burst or longer reach (max 1× Range)
  {
    id: 'laser', name: 'Laser', cost: 200,
    stats: { damage: 8, range: 5.0, fireRate: 5.0, projectileSpeed: 9,
      props: { projectileColor: { r: 0.61, g: 0.35, b: 0.71 }, projectileScale: 0.07 } },
    template: Assets.Laser,
    upgrades: tree(
      [Upg.rate(175),    Upg.damage(175)],
      [[Upg.damage(250), Upg.range(250)],    [Upg.rate(250),    Upg.range(250)]],
      [[Upg.rate(400),   Upg.damage(400)],   [Upg.damage(400),  Upg.rate(400)],
       [Upg.damage(400), Upg.rate(400)],     [Upg.rate(400),    Upg.damage(400)]],
    ),
  },
];
