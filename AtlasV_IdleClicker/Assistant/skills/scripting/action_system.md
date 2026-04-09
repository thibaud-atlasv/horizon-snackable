---
name: action-system
summary: Deep reference for ActionService, ActionDefs, and the declare/refresh pattern
include: on-demand
---

# Action System — Deep Reference

The action system is the bridge between game logic (services) and the shop UI (ActionListUIComponent). Understanding it fully is essential before modifying any service or adding new features.

---

## Core Concepts

### IAction (runtime)

```typescript
interface IAction {
  id       : string;   // matches ActionDefs id
  label    : string;   // bold title in shop
  detail   : string;   // small description below title
  cost     : number;   // 0 = shows "FREE" or "Locked" depending on isEnabled
  isEnabled: boolean;  // false = grayed out
}
```

### IActionDef (static config in ActionDefs.ts)

```typescript
interface IActionDef {
  readonly id          : string;
  readonly label       : string;
  readonly description : string;
  readonly cost        : number;
  readonly costPow    ?: number;   // default 2 — scaling base: cost × costPow^level
  readonly maxCount   ?: number;   // default 1 — 0 = unlimited, 1 = one-time
  readonly unlock     ?: Readonly<Record<string, number>>;
}
```

### Cost Scaling

```typescript
getScaledCost(id: string, level?: number): number
// level defaults to StatsService.get(id) — how many times it's been purchased
// cost × costPow^level
// For one-time purchases (maxCount: 1): level is always 0 → cost = def.cost
// For repeatable (maxCount: 0): cost grows each purchase
```

---

## declare() + refreshDeclared() Lifecycle

```
Service.onReady()
  └─ ActionService.declare('id', factory)     // factory stored in _declarations map

Events.ResourceChanged  ──┐
Events.StatsChanged     ──┤──► ActionService.refreshDeclared()
                           |     for each declared id:
                           |       canReveal(id)?
                           |         YES → { id, ...factory() } → _actions.set
                           |         NO  → _actions.delete (if present)
                           └─── if anything changed → Events.ActionRegistryChanged

Service.onActionTriggered('myfeature.upgrade')
  └─ ResourceService.buy('myfeature.upgrade')  // fires ResourceChanged + StatsChanged
  └─ this._state += delta
  └─ ActionService.refreshDeclared()           // explicit call — factories now read new this._state
```

### Why the explicit refreshDeclared() after state change?

`buy()` fires events synchronously BEFORE the service updates `this._state`. The auto-refresh from those events would re-run factories with the OLD state. The explicit `refreshDeclared()` at the end ensures factories reflect the new state. Both refreshes happen in the same JS call stack — only the final UI frame render matters.

---

## canReveal() Logic

```typescript
canReveal(id: string): boolean {
  if (_isMaxed(id)) return false;    // purchased >= maxCount
  return _actions.has(id)            // already shown
      || isUnlocked(def.unlock);     // conditions just met
}
```

Once an action is registered it stays registered (even if gold drops below the unlock threshold), because `canReveal` returns true for already-registered actions (except when maxed).

---

## isUnlocked() Keys

Evaluated in `Utils/checkUnlock.ts`:

```typescript
'gold'         → ResourceService.getGold() >= required  // current balance
'gold_earned'  → StatsService.get('gold_earned')        // cumulative (monotonic)
'taps'         → StatsService.get('taps')
'generator.N'  → StatsService.get('generator.N')        // units owned
'<action.id>'  → StatsService.get('<action.id>')        // times purchased via buy()
'crit.proc'    → StatsService.get('crit.proc')
// etc.
```

All conditions in the map must be satisfied simultaneously.

---

## register() vs declare()

| | `declare()` | `register()` |
|---|---|---|
| When to use | startup, standard actions | special cases (dynamic cost like vault.lock) |
| Re-evaluation | automatic on ResourceChanged + StatsChanged | manual only |
| Cleanup (maxed) | automatic in refreshDeclared() | automatic on next register() call |
| Detail update | factory re-runs | explicit update() or register() call |
| Ordering | declaration order | insertion order |

Use `register()` directly only when the data cannot be expressed as a factory closure (e.g. when the action's cost is computed from external state that doesn't trigger StatsChanged or ResourceChanged).

---

## update() — Lightweight Patch

For live data that changes frequently without triggering ResourceChanged/StatsChanged:

```typescript
// Only patches the specified fields; no-op if nothing changed
ActionService.get().update('vault.lock', {
  detail: `Vault locked — ${Math.ceil(this._timeLeft)}s remaining`,
});
```

Use `update()` instead of `refreshDeclared()` when only one action needs updating and the change happens on every tick.

---

## Shop Display Rules

The `ActionListUIComponent` formats the cost field:

```
cost > 0         → display number with k/M/B/T suffix
cost = 0 + isEnabled = true   → "FREE"
cost = 0 + isEnabled = false  → "Locked"
```

Actions appear in the order they were first registered in `_actions` map (declaration order for declared actions).

---

## Adding an Action ID

1. Add entry to `ActionDefs.ts` (the source of truth)
2. Add `declare()` call in the owning service's `onReady()`
3. Add handler in `onActionTriggered()`
4. No other files need changes

---

## Upgrade Chain Pattern

```
generator.upgrade.0.0  unlock: { 'generator.0': 3 }         ← gated on ownership count
generator.upgrade.0.1  unlock: { 'generator.upgrade.0.0': 1 } ← gated on previous rank purchased
generator.upgrade.0.2  unlock: { 'generator.upgrade.0.1': 1 }
...
```

Works because `ResourceService.buy('generator.upgrade.0.0')` increments `StatsService.get('generator.upgrade.0.0')`, which `isUnlocked` checks for the next rank.

The same pattern applies to any feature upgrade chain:
```
myfeature.upgrade1  unlock: { 'myfeature.unlock': 1, 'myfeature.proc': 5 }
myfeature.upgrade2  unlock: { 'myfeature.upgrade1': 1, 'myfeature.proc': 15 }
```

---

## Modifier Priority Guide

```
Priority 10 — Crit (runs first — isCrit flag set before frenzy multiplies it)
Priority  5 — New multiplicative modifiers (between crit and frenzy)
Priority  0 — Frenzy (runs last — multiplies the already-critted amount)
```

Modifiers compose: `rawAmount → ×crit → ×new → ×frenzy = finalAmount`
