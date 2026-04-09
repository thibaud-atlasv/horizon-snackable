# H4_Idle — Project Summary

## Concept

Mobile portrait idle/clicker game (9×16 world units). **Triple S** design philosophy: **Short, Simple, Satisfying**.

Session = one complete run. No persistence between sessions — all state resets on world reload. The game progressively reveals features as the player reaches milestones, requiring zero tutorialization.

---

## Core Loop

1. **Tap** — generates gold manually
2. **Buy Generators** — passive income per cycle, each has its own production timer
3. **Buy Upgrades** — multiply generator output or tap value
4. **Unlock Features** — new mechanics appear progressively as milestones are reached

---

## Features

All features are upgradable and revealed progressively. The game starts with only the tap button visible.

| Feature | Description | Unlock condition |
|---------|-------------|-----------------|
| **Tap** | Manual gold per tap | From the start |
| **Farm** | Passive income per cycle | When player has 15g |
| **Cursor** | Auto-tapper (participates in frenzy) | After 1st farm + 50 taps |
| **Mine** | Stronger passive income | After 10 farms |
| **Crit** | % chance on any gain to multiply it | When player has 150g |
| **Frenzy** | Every X taps, all gains boosted for Xs | After 150 taps |
| **Interest** | Every Xs, earn % of current gold | After earning 1 000 gold |
| **Vault** | Lock 50% gold for Xs → returned with % bonus (auto-collects) | After earning 5 000 gold |

**Crit** — rolled on every gain regardless of source. Upgradable: chance, multiplier. Deeper upgrades unlock after N crits fired.

**Frenzy** — tap counter fills a threshold; at threshold all gains are multiplied for a duration. Upgradable: tap threshold, duration, multiplier. Deeper upgrades unlock after N activations.

**Interest** — passive % of current gold paid on a countdown timer. Upgradable: rate, interval. Deeper upgrades unlock after N payouts.

**Vault** — player locks 50% of gold; unspendable until timer expires, then automatically returned with a bonus multiplier. Lock button shows remaining countdown. Upgradable: duration, bonus multiplier. Deeper upgrades unlock after N locks.

---

## Architecture At a Glance

```
Components/
  GameManager             → tick loop (fires Events.Tick every TICK_INTERVAL)
  TapButtonUIComponent    → XAML tap button + bounce animation → fires Events.PlayerTap
  FloatingTextUIComponent → XAML floating "+N" text pool (20 slots), color-coded by GainSource
  GoldCounterDisplay      → XAML gold counter, listens to ResourceChanged
  ActionListUIComponent   → XAML shop panel (bottom), ItemsControl bound to ActionService

Services/
  ResourceService  → gold state + gain modifier pipeline (addGain / spend / buy)
  TapService       → PlayerTap handling, tap multiplier, cursor auto-clicker
  GeneratorService → generator counts, production cycles, upgrade chain
  ActionService    → action registry: declare / register / update / unregister / trigger / refreshDeclared
  StatsService     → cumulative counters (taps, gold_earned, generator.N, feature stats) → fires StatsChanged
  CritService      → crit modifier + upgrade chain
  FrenzyService    → frenzy modifier + upgrade chain
  InterestService  → interest payout timer + upgrade chain
  VaultService     → vault lock/auto-collect + upgrade chain

Defs/
  ActionDefs.ts    → ALL player-facing actions: label, description, cost, costPow, maxCount, unlock conditions
  GeneratorDefs.ts → generator production stats: baseOutput, cycleTime, upgradeMultipliers

UI/
  TapButton.xaml    → main tap button (ScreenSpace, centered)
  GoldCounter.xaml  → gold counter display (ScreenSpace, top)
  FloatingText.xaml → animated "+N" text slots, pooled ×20, color per GainSource
  ActionList.xaml   → scrollable shop panel with dynamic ItemsControl

Types.ts     → all interfaces, enums, events (zero local imports)
Constants.ts → tuning values (zero local imports)
Assets.ts    → TemplateAsset refs
```

---

## Event Bus

All inter-system communication goes through events. No direct service-to-service references.

| Event | Fired by | Consumed by |
|-------|----------|-------------|
| `Events.PlayerTap` | ClientSetup, cursor (TapService) | TapService, FrenzyService |
| `Events.Tick { dt }` | GameManager | GeneratorService, FrenzyService, InterestService, VaultService |
| `Events.ResourceChanged` | ResourceService | ActionService (auto-refresh), GoldCounterDisplay, all services for affordability |
| `Events.StatsChanged` | StatsService | ActionService (auto-refresh for unlock conditions) |
| `Events.GainApplied { amount, source, isCrit, isFrenzy }` | ResourceService | FloatingTextUIComponent |
| `Events.ActionTriggered { id }` | ActionService | Owning service per action prefix |
| `Events.ActionRegistryChanged` | ActionService | ActionListUIComponent |

---

## Modifier Pipeline

Every gold gain passes through `ResourceService.addGain(rawAmount, source)`:

```
rawAmount → [Crit ×? @ priority 10] → [Frenzy ×? @ priority 0] → [...future modifiers]
          → _gold += finalAmount → StatsService.increment('gold_earned') → GainApplied → ResourceChanged
```

Modifiers self-register in service `onActionTriggered` (after unlock purchase).
**Adding a new modifier = one `registerModifier(fn, priority)` call. No existing code changes.**

---

## Floating Text Color Coding

| Color | Source | Modifier |
|-------|--------|----------|
| Gold `#FFD700` | Tap | — |
| Light green `#90EE90` | Passive (generators) | — |
| Cyan `#00BFFF` | Interest | — |
| Orchid `#DA70D6` | Vault payout | — |
| Orange `#FF6600` | Any | Crit (always priority) |
| Blend toward yellow | Any | Frenzy only |
| Blend toward red | Any | Crit + Frenzy |

---

## Action System

### Declaration Pattern (service startup)

Every service declares its actions once in `onReady()`. ActionService auto-evaluates factories on `ResourceChanged` + `StatsChanged`:

```typescript
@subscribe(OnServiceReadyEvent)
onReady(): void {
  ActionService.get().declare('feature.unlock', () => ({
    label    : def.label,
    detail   : `${def.description} [current state]`,
    cost     : def.cost,
    isEnabled: ResourceService.get().canAfford(def.cost),
  }));
}
```

### Purchase Pattern (onActionTriggered)

```typescript
if (p.id === 'feature.upgrade') {
  if (!ResourceService.get().buy(p.id)) return; // spend + StatsService.increment(id)
  this._state += delta;                          // update internal state
  ActionService.get().refreshDeclared();         // force factories to re-run with new state
}
```

### Auto-Reveal + Auto-Cleanup

- `canReveal(id)` = `!isMaxed(id) && (isRegistered(id) || isUnlocked(def.unlock))`
- `_isMaxed(id)` = `StatsService.get(id) >= def.maxCount` (maxCount: 1 = one-time, 0 = unlimited)
- `refreshDeclared()` removes maxed actions automatically — no explicit `unregister()` needed

### Unlock Keys in ActionDefs

| Key | Checks | Use for |
|-----|--------|---------|
| `gold` | `ResourceService.getGold()` | Appears when affordable |
| `gold_earned` | `StatsService.get('gold_earned')` | Mid/late objectives (monotonic) |
| `taps` | `StatsService.get('taps')` | Tap milestone |
| `generator.N` | `StatsService.get('generator.N')` | Generator ownership count |
| `<action.id>` | `StatsService.get('<action.id>')` | Times purchased (works because `buy()` increments) |
| `crit.proc`, `frenzy.activated`, etc. | `StatsService.get(key)` | Feature usage milestones |

---

## Generator Production

Each generator has an independent accumulator. On `Events.Tick`:

```
accum += dt
if accum >= cycleTime:
  produce: count × baseOutput × getOutputMultiplier(id) → addGain(Passive)
  accum -= cycleTime
```

Cost scaling: `getScaledCost('generator.buy.N', ownedCount)` — cost and `costPow` live in ActionDefs.
Upgrade chain: each rank's unlock requires `<previous rank id>: 1` — enforced by `StatsService` via `buy()`.

---

## Key Extensibility Points

| Goal | Where to change |
|------|----------------|
| Add a generator tier | `GeneratorDefs.ts` (production stats) + `ActionDefs.ts` (buy + 10 upgrade entries) |
| Add a tap upgrade | Entry in `ActionDefs.ts`, handle in `TapService.onActionTriggered` |
| Add a new feature system | New service: `declare()` in `onReady`, `onActionTriggered` for purchases, optional `registerModifier()` |
| Add a gain modifier | `ResourceService.get().registerModifier(fn, priority)` in `onActionTriggered` after unlock purchase |
| Add a new unlock condition | New key in `ActionDefs.unlock` + handle in `checkUnlock.ts` `isUnlocked()` |

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| No save / session = full run | Triple S — sessions are short; persistence adds complexity with no benefit |
| Progressive feature reveal | No tutorialization needed; discovery is the reward |
| Self-registering services | Maximum isolation — no central feature registry, no circular deps |
| ActionDefs as source of truth | Cost, scaling, unlock conditions, labels all in one place per action |
| `declare()` + auto-refresh | Services declare what to show; ActionService decides when to show it |
| `ResourceService.buy()` | Standard purchase in one call: spend + stat increment + return bool |
| Vault auto-collects | Removes friction; the reveal moment (gold gain VFX) is reward enough |
| All logic client-side only | SDK constraint + simplicity |
