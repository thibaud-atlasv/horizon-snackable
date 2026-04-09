---
name: architecture
summary: H4_Idle system map — ownership, data flows, events, patterns
include: always
---

# H4_Idle Architecture

## Ownership Map

| File | Owns | Communicates via |
|------|------|-----------------|
| `Components/GameManager` | Tick loop only | fires `Events.Tick { dt }` every `TICK_INTERVAL` |
| `Components/TapButtonUIComponent` | Tap button XAML + animation | fires `Events.PlayerTap`, listens to `Events.PlayTapAnimation` |
| `Components/FloatingTextUIComponent` | "+N" text pool (20 slots) | listens to `Events.GainApplied`, `Events.Tick` |
| `Components/GoldCounterDisplay` | Gold counter XAML | listens to `Events.ResourceChanged` |
| `Components/ActionListUIComponent` | Shop panel XAML (ItemsControl) | listens to `Events.ActionRegistryChanged`; fires via `ActionService.trigger()` |
| `Services/ResourceService` | Gold balance, gain modifier pipeline | fires `Events.ResourceChanged`, `Events.GainApplied` |
| `Services/StatsService` | Cumulative counters (taps, gold_earned, generator.N, feature stats) | fires `Events.StatsChanged` on every `increment()` |
| `Services/ActionService` | Action registry: declare/register/update/unregister/trigger/refreshDeclared | fires `Events.ActionTriggered`, `Events.ActionRegistryChanged`; listens to `ResourceChanged`+`StatsChanged` |
| `Services/TapService` | PlayerTap handler, click multiplier, cursor auto-clicker, tap upgrades | calls `ResourceService.addGain()` |
| `Services/GeneratorService` | Generator counts, production cycles, upgrade chain | calls `ResourceService.addGain()` |
| `Services/CritService` | Crit roll modifier + crit upgrade chain | registers modifier with `ResourceService` |
| `Services/FrenzyService` | Tap counter, frenzy timer, frenzy modifier + upgrade chain | registers modifier with `ResourceService` |
| `Services/InterestService` | Interest payout timer + upgrade chain | calls `ResourceService.addGain()` |
| `Services/VaultService` | Vault lock/auto-collect + upgrade chain | calls `ResourceService.addGain()` |
| `Defs/ActionDefs` | ALL player-facing action metadata (cost, costPow, maxCount, unlock, label, description) | imported by all services + ActionService |
| `Defs/GeneratorDefs` | Generator production stats (baseOutput, cycleTime, upgradeMultipliers) | imported by GeneratorService |
| `Utils/checkUnlock` | `isUnlocked(unlock)` — evaluates ActionDefs unlock map | imported by ActionService |

---

## Events Reference

```typescript
Events.PlayerTap          // {} — player tapped or cursor auto-tap
Events.PlayTapAnimation   // {} — trigger tap button visual animation
Events.Tick               // { dt: number } — game loop tick
Events.ResourceChanged    // { type: ResourceType, amount: number }
Events.StatsChanged       // {} — any stat counter incremented
Events.GainApplied        // { amount, source: GainSource, isCrit, isFrenzy }
Events.ActionTriggered    // { id: string }
Events.ActionRegistryChanged // {} — shop list needs rebuild
```

---

## Data Flow: Tap → Gold

```
[Player tap]
→ ClientSetup → Events.PlayerTap
→ TapService: StatsService.increment('taps')
              ResourceService.addGain(BASE_CLICK_VALUE × multiplier, Tap)
→ ResourceService: [Crit?] → [Frenzy?] → _gold += → GainApplied + ResourceChanged
→ ActionService.onResourceChanged() → refreshDeclared() [affordability update]
```

---

## Data Flow: Generator Production

```
[Events.Tick]
→ GeneratorService: accum[N] += dt
  when accum >= cycleTime:
    addGain(count × baseOutput × upgradeMultiplier, Passive)
    accum -= cycleTime
→ ResourceService pipeline → GainApplied + ResourceChanged
```

---

## Data Flow: Buy Action

```
[UI tap] → ActionListUIComponent → ActionService.trigger(id) → Events.ActionTriggered
→ Owning service onActionTriggered:
    ResourceService.buy(id)         // spend(scaledCost) + StatsService.increment(id) + bool
    this._state += delta            // update internal state
    ActionService.refreshDeclared() // re-run factories with new state
→ ResourceService.spend() fires ResourceChanged → ActionService auto-refresh
→ StatsService.increment() fires StatsChanged → ActionService auto-refresh
```

---

## Data Flow: Feature Reveal (declare pattern)

```
[OnServiceReadyEvent]
→ CritService.onReady():
    ActionService.declare('crit.unlock', factory)  // factory = closure on this
    ActionService.declare('crit.chance', factory)
    ActionService.declare('crit.power',  factory)

[Events.ResourceChanged or Events.StatsChanged]
→ ActionService.refreshDeclared():
    for each declared id:
      canReveal(id)?
        true  → register({ id, ...factory() })   // factory reads current service state
        false → remove from registry if present  // handles maxed + conditions not yet met
    if anything changed → Events.ActionRegistryChanged
```

---

## Data Flow: Modifier Pipeline

```
ResourceService.addGain(rawAmount, source)
  → for each modifier (sorted by priority desc):
      [priority 10] CritService lambda  → rolls Math.random() < _chance
                                          StatsService.increment('crit.proc')
                                          returns { amount: × multiplier, isCrit: true }
      [priority  0] FrenzyService lambda → if _active: { amount: × multiplier, isFrenzy: true }
  → _gold += finalAmount
  → StatsService.increment('gold_earned', amount)
  → Events.GainApplied { amount, source, isCrit, isFrenzy }
  → Events.ResourceChanged { type: Gold, amount: _gold }
```

---

## ActionService API

```typescript
// Declaration (called once in onReady)
declare(id: string, factory: () => Omit<IAction, 'id'>): void

// Auto-called on ResourceChanged + StatsChanged — or manually after internal state change
refreshDeclared(): void

// Direct registry manipulation (for non-standard cases)
register(action: IAction): void    // upsert; auto-unregisters if isMaxed
update(id, patch): void            // lightweight patch (e.g. vault countdown)
unregister(id): void               // force remove
isRegistered(id): boolean
canReveal(id): boolean             // !isMaxed && (registered || isUnlocked(def.unlock))

// Called by UI
trigger(id): void                  // fires Events.ActionTriggered
getAll(): readonly IAction[]
```

---

## ResourceService API

```typescript
addGain(rawAmount: number, source: GainSource): void  // runs modifier pipeline
spend(amount: number): boolean                         // returns false if insufficient
canAfford(amount: number): boolean
getGold(): number
buy(actionId: string): boolean   // spend(getScaledCost(id)) + StatsService.increment(id)
registerModifier(fn: GainModifier, priority: number): void
```

---

## StatsService API

```typescript
increment(key: string, amount?: number): void  // fires StatsChanged
get(key: string): number
```

**Known stat keys:**

| Key | Incremented by | Used for |
|-----|---------------|---------|
| `taps` | TapService | frenzy threshold, tap.buy/tap.upgrade unlock |
| `gold_earned` | ResourceService.addGain | interest.unlock, vault.unlock reveal |
| `generator.N` | GeneratorService._addOne | mine unlock, generator upgrade chain |
| `<action.id>` | ResourceService.buy | maxCount enforcement, upgrade chain unlock |
| `crit.proc` | CritService modifier | crit upgrade chain reveal |
| `frenzy.activated` | FrenzyService._activate | frenzy upgrade chain reveal |
| `interest.payout` | InterestService.onTick | interest upgrade chain reveal |
| `vault.lock` | VaultService._handleLock | vault upgrade chain reveal |

---

## Action ID Conventions

| Pattern | Owner | Example |
|---------|-------|---------|
| `generator.buy.{N}` | GeneratorService | `generator.buy.0` |
| `generator.upgrade.{N}.{rank}` | GeneratorService | `generator.upgrade.0.3` |
| `tap.buy` | TapService | cursor purchase (maxCount: 10) |
| `tap.upgrade` | TapService | tap multiplier (maxCount: 0 = unlimited) |
| `crit.*` | CritService | `crit.unlock`, `crit.chance`, `crit.power` |
| `frenzy.*` | FrenzyService | `frenzy.unlock`, `frenzy.threshold`, `frenzy.duration`, `frenzy.power` |
| `interest.*` | InterestService | `interest.unlock`, `interest.rate`, `interest.interval` |
| `vault.*` | VaultService | `vault.unlock`, `vault.lock`, `vault.duration`, `vault.bonus` |
