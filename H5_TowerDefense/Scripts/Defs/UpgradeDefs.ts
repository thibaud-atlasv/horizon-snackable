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
