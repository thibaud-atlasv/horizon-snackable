/**
 * UpgradeDefs.ts — Upgrade atom catalog and binary tree builder.
 *
 * tree(t1, t2, t3): builds a readonly [IUpgradeNode, IUpgradeNode] from flat arrays.
 *   t1: 2 root atoms, t2: 2 pairs (one per root), t3: 4 pairs (one per t2 node).
 *   Each node's apply() is a pure function (ITowerStats) → ITowerStats.
 * Upg: named atom constructors — each takes a cost and returns an Atom.
 *   rate: fireRate × 2 | damage: damage × 2 | range: +2.0 world units
 *   splash: splashRadius + 0.8 | slowFactor: ×0.7 (min 0.15) | slowDuration: +1.0s
 *   crit: critChance + 0.20 (max 0.80) — arrow/cannon only, handled by CritService.
 * To add a new atom: add a new entry to Upg, handle its props key in a pipeline service.
 */
import type { IUpgradeNode, ITowerStats } from '../Types';

// ── Atom type ─────────────────────────────────────────────────────────────────

type Atom = Omit<IUpgradeNode, 'next'>;
type AtomFn = (cost: number) => Atom;

// ── Tree builder ──────────────────────────────────────────────────────────────

export function tree(
  t1: readonly [Atom, Atom],
  t2: readonly [readonly [Atom, Atom], readonly [Atom, Atom]],
  t3: readonly [
    readonly [Atom, Atom], readonly [Atom, Atom],
    readonly [Atom, Atom], readonly [Atom, Atom],
  ],
): readonly [IUpgradeNode, IUpgradeNode] {
  const leaf = (a: Atom): IUpgradeNode => ({ ...a });
  const branch = (
    root: Atom,
    t2pair: readonly [Atom, Atom],
    t3left: readonly [Atom, Atom],
    t3right: readonly [Atom, Atom],
  ): IUpgradeNode => ({
    ...root,
    next: [
      { ...t2pair[0], next: [leaf(t3left[0]),  leaf(t3left[1])]  },
      { ...t2pair[1], next: [leaf(t3right[0]), leaf(t3right[1])] },
    ],
  });

  return [
    branch(t1[0], t2[0], t3[0], t3[1]),
    branch(t1[1], t2[1], t3[2], t3[3]),
  ];
}

// ── Upgrade catalog ───────────────────────────────────────────────────────────

const u = (label: string, apply: (s: ITowerStats) => ITowerStats): AtomFn =>
  (cost: number) => ({ label, cost, apply });

export const Upg = {
  rate:         u('Rate',     s => ({ ...s, fireRate: s.fireRate * 2.0 })),
  damage:       u('Damage',   s => ({ ...s, damage: s.damage * 2.0 })),
  range:        u('Range',    s => ({ ...s, range: s.range + 2.0 })),
  splash:       u('Splash',   s => {
    const cur = (s.props['splashRadius'] as number | undefined) ?? 0;
    return { ...s, props: { ...s.props, splashRadius: cur + 0.8 } };
  }),
  slowFactor:   u('Slow',    s => {
    const cur = (s.props['slowFactor'] as number | undefined) ?? 0.5;
    return { ...s, props: { ...s.props, slowFactor: Math.max(0.15, cur * 0.7) } };
  }),
  slowDuration: u('Duration', s => {
    const cur = (s.props['slowDuration'] as number | undefined) ?? 1.5;
    return { ...s, props: { ...s.props, slowDuration: cur + 1.0 } };
  }),
  crit: u('Crit', s => {
    const cur = (s.props['critChance'] as number | undefined) ?? 0.2;
    const mul = (s.props['critMultiplier'] as number | undefined) ?? 1;

    return { ...s, props: { ...s.props, critChance: Math.max(cur, 0.2), critMultiplier: mul + 1 } };
  }),
};
