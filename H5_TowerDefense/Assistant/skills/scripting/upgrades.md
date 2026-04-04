---
name: scripting-upgrades
summary: How the upgrade tree system works in H5 TowerDefense. How to add new upgrade atoms, new tower paths, and new upgrade effects.
include: as_needed
---

# Upgrade System

## Tree Structure

Each tower has exactly 2 root nodes (T1 choices). Each T1 node branches into 2 T2 nodes, each T2 into 2 T3 leaf nodes. Total: 8 possible end-states per tower.

```
[T1-L] → [T2-LL] → [T3-LLL] or [T3-LLR]
       ↘ [T2-LR] → [T3-LRL] or [T3-LRR]
[T1-R] → [T2-RL] → [T3-RLL] or [T3-RLR]
       ↘ [T2-RR] → [T3-RRL] or [T3-RRR]
```

Built with `tree()` in `UpgradeDefs.ts`:
```typescript
tree(
  [T1_left, T1_right],
  [[T2_LL, T2_LR], [T2_RL, T2_RR]],
  [[T3_LLL, T3_LLR], [T3_LRL, T3_LRR],
   [T3_RLL, T3_RLR], [T3_RRL, T3_RRR]],
)
```

## Upgrade Atoms (`UpgradeDefs.ts`)

Each atom is a function `(cost: number) → Atom`. An `Atom` has `{ label, cost, apply }`.
`apply` is a pure function `(ITowerStats) → ITowerStats`.

```typescript
export const Upg = {
  rate:         u('Rate',     s => ({ ...s, fireRate: s.fireRate * 2.0 })),
  damage:       u('Damage',   s => ({ ...s, damage: s.damage * 2.0 })),
  range:        u('Range',    s => ({ ...s, range: s.range + 2.0 })),
  splash:       u('Splash',   s => { /* splashRadius + 0.8 */ }),
  slowFactor:   u('Slow+',    s => { /* slowFactor × 0.7, min 0.15 */ }),
  slowDuration: u('Duration', s => { /* slowDuration + 1.0 */ }),
  crit:         u('Crit',     s => { /* critChance + 0.20, max 0.80 */ }),
};
```

## Adding a New Upgrade Atom

Add to `UpgradeDefs.ts` → `Upg` object:

```typescript
pierce: u('Pierce', s => {
  const cur = (s.props['pierceCount'] as number | undefined) ?? 0;
  return { ...s, props: { ...s.props, pierceCount: cur + 1 } };
}),
```

Then handle `props.pierceCount` in the appropriate pipeline modifier (e.g., a `PierceSystem` registered in `HitService`).

## Applying Upgrades at Runtime

`TowerService` stores the upgrade path taken (array of choices). When a tower shoots, `TowerController` computes the current live stats by walking the upgrade path and calling each node's `apply(stats)` in sequence.

## Cost Balancing Rule

| Tier | Max cost |
|------|----------|
| T1 | ≤ tower base cost |
| T2 | ≤ 1.5 × tower base cost |
| T3 | ≤ 3 × tower base cost |

## Design Constraints (current)

| Constraint | Reason |
|-----------|--------|
| No `splash` on Arrow | Arrow identity = precision, not AoE |
| No `slowFactor`/`slowDuration` on non-Frost | Slow identity = Frost only |
| `crit` on Arrow: max 2× per path (T1+T3) | Arrow exclusive mechanic |
| `crit` on Cannon: max 1× per path | Exciting capstone, not a full identity |
| `range` on Laser: max 1× per path | Prevent extreme reach stacking (base range already 5.0) |

## Adding a New Upgrade Effect to a Tower

1. Define a new atom in `Upg` (or reuse existing)
2. Add it to the tower's `tree(...)` call in `TowerDefs.ts`
3. If the effect needs runtime handling (e.g., pierce, chain): create a new `@service()` that registers into `HitService` — see `scripting/pipelines.md`
