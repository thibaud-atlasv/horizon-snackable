---
name: adding-systems
summary: Step-by-step guide to extending H4_Idle — new generators, features, modifiers, unlock conditions
include: on-demand
---

# Extending H4_Idle

---

## 1. Adding a New Generator

A generator produces gold passively on a cycle timer. Adding one requires two files.

### Step 1 — `Defs/GeneratorDefs.ts`

Add an entry to `GENERATOR_DEFS`. Only production stats live here; cost/scaling live in ActionDefs.

```typescript
{ id: 2, name: 'Factory',  baseOutput: 500,  cycleTime: 20,
  upgradeMultipliers: [2, 3, 4.5, 6.75, 10.125, 15.1875, 22.78, 34.17, 51.26, 76.9] },
```

`upgradeMultipliers` must have exactly 10 entries (tuple type enforced). Each value is the output multiplier granted by that rank.

### Step 2 — `Defs/ActionDefs.ts`

Add the buy action and 10 upgrade entries. Follow existing patterns exactly.

```typescript
// Buy action — unlock condition: how many of the previous generator needed
{ id: 'generator.buy.2', label: 'Buy Factory', description: 'Industrial gold production.',
  cost: 50_000, costPow: 1.15, maxCount: 0, unlock: { 'generator.1': 10 } },

// Upgrade chain — each rank requires the previous
{ id: 'generator.upgrade.2.0', label: 'Factory Training I',     description: 'Factories are twice as efficient.',   cost:      500_000, unlock: { 'generator.2':   3 } },
{ id: 'generator.upgrade.2.1', label: 'Factory Training II',    description: 'Factories produce even more gold.',   cost:    2_000_000, unlock: { 'generator.upgrade.2.0': 1 } },
// ... ranks 2–9 follow the same chain pattern
```

**That's all.** GeneratorService reads `GENERATOR_DEFS` and `ACTION_DEFS` dynamically — no code changes needed.

---

## 2. Adding a New Feature Service

A feature service is a self-contained system with its own unlock, upgrades, and optional modifier.

### Step 1 — `Types.ts` (if new GainSource needed)

```typescript
export enum GainSource {
  // ... existing
  MyFeature = 4,
}
```

### Step 2 — `Defs/ActionDefs.ts`

Add all action entries for the feature. Follow this structure:

```typescript
// ─── MyFeatureService ──────────────────────────────────────────────────────────
const MY_FEATURE_DEFS: IActionDef[] = [
  // One-time unlock — appears when player has enough gold_earned
  { id: 'myfeature.unlock',   label: 'Unlock Feature',  description: 'Short description.',        cost: X,              unlock: { 'gold_earned': Y } },
  // Repeatable upgrades — chain on unlock + usage counter
  { id: 'myfeature.upgrade1', label: 'Upgrade Thing 1', description: 'What it does.',              cost: A, maxCount: 0, unlock: { 'myfeature.unlock': 1, 'myfeature.proc': 5 } },
  { id: 'myfeature.upgrade2', label: 'Upgrade Thing 2', description: 'What it does.',              cost: B, maxCount: 0, unlock: { 'myfeature.unlock': 1, 'myfeature.proc': 15 } },
];
// Add to ACTION_DEFS array at the bottom
```

### Step 3 — `Scripts/Services/MyFeatureService.ts` (new file)

```typescript
/**
 * MyFeatureService — [what it does].
 */
import { OnServiceReadyEvent, Service, service, subscribe } from 'meta/worlds';
import { BASE_MY_VALUE } from '../Constants';
import { Events } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';
import { StatsService } from './StatsService';
import { getActionDef, getScaledCost } from '../Defs/ActionDefs';

@service()
export class MyFeatureService extends Service {

  private _value: number = BASE_MY_VALUE;

  private readonly _resources = Service.injectWeak(ResourceService);

  // ── Startup: declare all actions ──────────────────────────────────────────────

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    const unlockDef = getActionDef('myfeature.unlock');
    ActionService.get().declare('myfeature.unlock', () => ({
      label    : unlockDef.label,
      detail   : `${unlockDef.description} [base: ${BASE_MY_VALUE}]`,
      cost     : unlockDef.cost,
      isEnabled: ResourceService.get().canAfford(unlockDef.cost),
    }));

    const upg1Def = getActionDef('myfeature.upgrade1');
    ActionService.get().declare('myfeature.upgrade1', () => ({
      label    : upg1Def.label,
      detail   : `${upg1Def.description} [${this._value} -> ${this._value + DELTA}]`,
      cost     : getScaledCost('myfeature.upgrade1'),
      isEnabled: ResourceService.get().canAfford(getScaledCost('myfeature.upgrade1')),
    }));
    // ... more upgrades
  }

  // ── Optional: passive tick ────────────────────────────────────────────────────

  @subscribe(Events.Tick)
  onTick(p: Events.TickPayload): void {
    if (!this._isPurchased()) return;
    // ... passive logic
    // When the feature fires:
    StatsService.get().increment('myfeature.proc');
    // StatsChanged → ActionService.refreshDeclared() reveals deeper upgrades automatically
  }

  // ── Action handling ───────────────────────────────────────────────────────────

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (!p.id.startsWith('myfeature.')) return;

    if (p.id === 'myfeature.unlock') {
      if (!ResourceService.get().buy(p.id)) return;
      // Optional: register a gain modifier
      ResourceService.get().registerModifier((amount, _source) => {
        // ... transform amount
        return { amount: amount * this._value };
      }, 5 /* priority */);
      return;
    }

    if (p.id === 'myfeature.upgrade1') {
      if (!ResourceService.get().buy(p.id)) return;
      this._value += DELTA;
      ActionService.get().refreshDeclared(); // re-run factories with new this._value
    }
  }

  // ── Public queries ────────────────────────────────────────────────────────────

  isPurchased(): boolean { return this._isPurchased(); }
  getValue()   : number  { return this._value; }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _isPurchased(): boolean {
    return StatsService.get().get('myfeature.unlock') > 0;
  }
}
```

### Step 4 — `Constants.ts`

Add tuning constants:

```typescript
export const BASE_MY_VALUE = 0.1;
export const MY_VALUE_DELTA = 0.05;
```

### Step 5 — Wire up (if needed)

If the service produces gold (not just a modifier), make sure it calls `this._resources?.addGain(amount, GainSource.MyFeature)`.

No registration in any central registry — the service self-activates on `OnServiceReadyEvent`.

---

## 3. Adding a Gain Modifier

A modifier transforms the gold amount (and/or adds flags) before it's credited.

```typescript
// In onActionTriggered after 'myfeature.unlock' purchase:
ResourceService.get().registerModifier((amount, source) => {
  if (!this._active) return { amount };          // pass-through
  if (source === GainSource.Tap) return { amount }; // only apply to specific sources
  return {
    amount  : amount * this._multiplier,
    isCrit  : false,                             // true = orange float text + priority color
    isFrenzy: false,                             // true = warm tint on float text
  };
}, PRIORITY /* number — higher runs first */);
```

**Priority guide:**
- `10` — Crit (must run before multipliers to set isCrit flag correctly)
- `5`  — New multiplicative modifier
- `0`  — Frenzy (runs last, multiplies everything including crit)

Modifiers compose multiplicatively: a ×2 crit then ×3 frenzy = ×6 final.

---

## 4. Adding a New Unlock Condition

If the built-in keys (`gold`, `gold_earned`, `taps`, `generator.N`, `<action.id>`) are insufficient:

### Step 1 — `Utils/checkUnlock.ts`

Add handling for the new key:

```typescript
export function isUnlocked(unlock?: Readonly<Record<string, number>>): boolean {
  if (!unlock) return true;
  return Object.entries(unlock).every(([key, required]) => {
    if (key === 'gold') return ResourceService.get().getGold() >= required;
    if (key === 'myservice.customStat') return MyService.get().getCustomValue() >= required;
    return StatsService.get().get(key) >= required;
  });
}
```

### Step 2 — Use in ActionDefs

```typescript
{ id: 'something.upgrade', ..., unlock: { 'myservice.customStat': 5 } }
```

### Step 3 — Trigger refresh

When the custom stat changes, make sure `StatsChanged` fires (either via `StatsService.increment()` or manually via `EventService.sendLocally(Events.StatsChanged, {})`).

---

## 5. Action Display Patterns

### Standard upgrade with current → next state

```typescript
detail: `${def.description} [${this._current} -> ${this._current + delta}]`
```

### Dynamic cost (not from ActionDefs)

```typescript
// Use register() directly instead of declare() when cost must be computed externally
ActionService.get().register({
  id: 'vault.lock',
  label: def.label,
  detail: `Lock 50% of gold [${Math.floor(gold * 0.5)}g]`,
  cost: Math.floor(gold * 0.5),
  isEnabled: gold > 0,
});
```

### Live update (e.g. countdown timer)

```typescript
// In onTick — lightweight patch, does NOT re-evaluate all factories
ActionService.get().update('vault.lock', {
  detail: `${Math.ceil(this._timeLeft)}s remaining`,
});
```

### One-time unlock (disappears after purchase)

Set `maxCount: 1` (default) in ActionDefs. After `buy(id)`, `StatsService.get(id) >= 1` → `_isMaxed` = true → `canReveal` = false → auto-removed on next `refreshDeclared()`. No explicit `unregister()` needed.

### Disabled-but-visible action

```typescript
isEnabled: false  // grayed out, shows "Locked" if cost = 0
```

---

## 6. Floating Text — Adding a New Source Color

When adding a new `GainSource`, add its color to `FloatingTextUIComponent._baseColor()`:

```typescript
private _baseColor(source: GainSource): string {
  switch (source) {
    case GainSource.Passive:     return '#90EE90';
    case GainSource.Interest:    return '#00BFFF';
    case GainSource.VaultPayout: return '#DA70D6';
    case GainSource.MyFeature:   return '#FFA07A'; // salmon — pick a distinct hue
    default:                     return '#FFD700'; // tap gold fallback
  }
}
```

---

## 7. Checklist for a New Feature

```
[ ] Constants.ts       — add BASE_* and tuning constants
[ ] Types.ts           — add GainSource variant if producing gold (optional)
[ ] ActionDefs.ts      — add all action entries (unlock + upgrade chain)
[ ] MyFeatureService.ts — declare(), onTick() if passive, onActionTriggered()
[ ] FloatingTextUIComponent — add color case if new GainSource
[ ] PROJECT_SUMMARY.md — update features table and extensibility points
[ ] architecture.md    — update ownership map
```
