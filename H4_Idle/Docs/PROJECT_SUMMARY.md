# H4_Idle — Project Summary

## Concept

Mobile portrait idle/clicker game (9×16 world units). **Triple S** design philosophy: **Short, Simple, Satisfying**.

Session = one complete run. No persistence between sessions — all state resets on world reload. The game progressively reveals features as the player reaches milestones, requiring zero tutorialization.

## Core Loop

1. **Tap** — generates gold manually
2. **Buy Generators** — passive income per cycle, each generator has its own production timer
3. **Buy Upgrades** — multiply generator output or click value
4. **Unlock Features** — new mechanics appear progressively as milestones are reached

## Features

All features are upgradable and revealed progressively. The game starts with only the tap button visible.

| Feature | Description | Unlock condition |
|---------|-------------|-----------------|
| **Tap** | Manual gold per tap | From the start |
| **Generators** | Passive income per cycle, buyable | After 10 taps |
| **Crit** | % chance on any gain to multiply it | After owning 5 generators |
| **Frenzy** | Every X taps, all gains boosted for Xs | After 100 taps |
| **Interest** | Every Xs, earn % of current gold | After earning 1 000 gold |
| **Vault** | Lock gold for Xs → returned with % bonus | After earning 5 000 gold |

**Crit** — rolled on every gain regardless of source. Upgradable: chance (5%→50%), multiplier (×2→×N). Visual feedback via `CritTriggered` event.

**Frenzy** — tap counter fills a progress bar; at threshold all gains are multiplied for a duration. Upgradable: tap threshold, duration, multiplier.

**Interest** — passive % of current gold paid on a countdown timer. Upgradable: rate, interval.

**Vault** — player locks 50% of gold; unspendable until timer expires, then returned with a bonus multiplier. Upgradable: duration, bonus multiplier.

## Architecture At a Glance

```
Components/
  ClientSetup      → camera lock, touch → Events.PlayerTap
  GameManager      → tick loop only (fires Events.Tick every TICK_INTERVAL)
  TapButtonUIComponent → UI tap button + bounce animation → Events.PlayerTap

Services/
  ResourceService  → gold database + gain modifier pipeline (addGain / spend)
  TapService       → PlayerTap handling, click multiplier, click upgrades
  GeneratorService → counts, production cycles, generator upgrades
  ActionService    → action registry (register / update / unregister / trigger)
  ProgressionService → milestone tracking, fires Events.FeatureUnlocked
  CritService      → crit modifier + upgrades, self-registers with ResourceService
  FrenzyService    → frenzy modifier + upgrades, self-registers with ResourceService
  InterestService  → interest payout + upgrades, self-managing
  VaultService     → vault lock/collect + upgrades, self-managing

Data/
  GeneratorDefs    → static generator catalog (id, baseCost, baseOutput, cycleTime, …)
  UpgradeDefs      → static upgrade catalog (tap upgrades + generator upgrades)

UI/
  TapButton.xaml   → main tap button XAML (ScreenSpace, centered, circular button)
Types.ts         → all interfaces, enums, events
Constants.ts     → tuning values
Assets.ts        → all TemplateAsset refs
```

## Modifier Pipeline

Every gold gain passes through `ResourceService.addGain(rawAmount, source)`, which runs all registered modifier functions before crediting:

```
rawAmount → [Crit ×?] → [Frenzy ×?] → [...future] → _gold += amount → GainApplied
```

Modifiers register themselves in `onReady()` — `ResourceService` has zero knowledge of specific modifiers:

```typescript
// In CritService.onReady():
ResourceService.get().registerModifier((amount, source) => {
  if (Math.random() >= this._chance) return amount;
  EventService.sendLocally(Events.CritTriggered, { ... });
  return amount * this._multiplier;
}, 10 /* priority */);
```

**Adding a new modifier = one `registerModifier()` call. No existing code changes.**

## Action Bus Pattern

Systems self-register their available actions in `ActionService`. The UI calls `trigger(id)` — the owning service handles the result.

```
register(action)  → visible in UI
update(id, patch) → refresh label / cost / isEnabled
unregister(id)    → hidden from UI

trigger(id) → fires Events.ActionTriggered → owning service handles spend + state change
```

Action ID conventions:
- `generator.buy.{id}` — buy a generator
- `generator.upgrade.{id}` — generator output upgrade
- `upgrade.buy.{id}` — click/tap upgrade
- `crit.*`, `frenzy.*`, `interest.*`, `vault.*` — feature-specific upgrades

## Progressive Reveal

`ProgressionService` tracks cumulative taps, gold earned, and generators owned. Each feature service self-registers its unlock condition in `onReady()`:

```typescript
ProgressionService.get().register('crit', { generatorsOwned: 5 });
```

On threshold met → `Events.FeatureUnlocked { featureId }` → feature registers its actions.

## Generator Production

Each generator type has an independent accumulator. On `Events.Tick`:

```
accum += dt
if accum >= cycleTime → produce (count × baseOutput × upgradeMultiplier) → addGain(Passive) → reset
```

## Key Extensibility Points

| Goal | Where to change |
|------|----------------|
| Add a generator | One entry in `Data/GeneratorDefs.ts` + optional template |
| Add a tap upgrade | Entry in `Data/UpgradeDefs.ts` with `targetGeneratorId: undefined` |
| Add a generator upgrade | Entry in `Data/UpgradeDefs.ts` with `targetGeneratorId: N` |
| Add a gain modifier | New service, call `ResourceService.get().registerModifier(fn, priority)` in `onReady()` |
| Add a new feature | New service, call `ProgressionService.get().register(id, condition)` in `onReady()` |

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| No save / session = full run | Triple S — sessions are short; persistence adds complexity with no benefit |
| Progressive feature reveal | No tutorialization needed; discovery is the reward |
| Self-registering systems | Maximum isolation — no central feature registry, no circular deps |
| Modifiers in ResourceService | Every gold path calls `addGain()` anyway; no extra import needed at call sites |
| Generator upgrades on GeneratorService | The system that owns counts also owns the multiplier; no cross-service query |
| Tap upgrades on TapService | Symmetric with generators; GameManager is just a tick loop |
| All logic client-side only | SDK constraint + simplicity |
