---
name: architecture
summary: H4_Idle system map — which service owns what, how data flows in the idle game
include: always
---

# H4_Idle Architecture

## Ownership Map

| File | Owns | Communicates via |
|------|------|-----------------|
| `Components/ClientSetup` | Camera lock, touch input | fires `Events.PlayerTap` |
| `Components/GameManager` | Tick loop only | fires `Events.Tick` every `TICK_INTERVAL` |
| `Services/ResourceService` | Gold amount, modifier pipeline | fires `Events.ResourceChanged`, `Events.GainApplied` |
| `Services/TapService` | PlayerTap handling, click multiplier, click upgrades | calls `ResourceService.addGain()` |
| `Services/GeneratorService` | Generator counts, production cycles, generator upgrades | fires `Events.GeneratorChanged`; calls `ResourceService.addGain()` |
| `Services/ActionService` | Action registry (register/update/unregister/trigger) | fires `Events.ActionTriggered`, `Events.ActionRegistryChanged` |
| `Services/ProgressionService` | Milestone tracking (taps, gold earned, generators owned) | fires `Events.FeatureUnlocked` |
| `Services/CritService` | Crit roll + crit upgrades | registers modifier with `ResourceService`; fires `Events.CritTriggered` |
| `Services/FrenzyService` | Tap counter, frenzy timer, frenzy upgrades | registers modifier with `ResourceService`; fires `Events.FrenzyStarted/Ended/Progress` |
| `Services/InterestService` | Interest payout timer + upgrades | calls `ResourceService.addGain()`; fires `Events.InterestPaid` |
| `Services/VaultService` | Vault lock/collect flow + upgrades | calls `ResourceService.addGain()`; fires `Events.VaultLocked/Ready/Collected` |
| `Data/GeneratorDefs` | Static generator catalog | imported by `GeneratorService` |
| `Data/UpgradeDefs` | Static upgrade catalog (tap + generator upgrades) | imported by `TapService`, `GeneratorService` |

## Data Flow: Tap → Gold

```
[Player tap]  → ClientSetup → Events.PlayerTap
               → TapService: addGain(base × clickMultiplier, Tap)
               → ResourceService: modifiers → _gold += → Events.GainApplied + Events.ResourceChanged
```

## Data Flow: Generator Production Cycle

```
[Every TICK_INTERVAL] → GameManager → Events.Tick { dt }
                       → GeneratorService: accum += dt per generator
                         when accum >= cycleTime:
                           addGain(count × baseOutput × upgradeMultiplier, Passive)
                           → ResourceService pipeline → Events.ResourceChanged
```

## Data Flow: Buy Action (Action Bus)

```
[UI button tap] → ActionService.trigger(id) → Events.ActionTriggered { id }
                → Owning service handles:
                    ResourceService.spend(cost)  ← deducts gold
                    update internal state
                    ActionService.update(id, patch) ← refresh isEnabled/detail
                    fire domain event (GeneratorChanged, UpgradePurchased, …)
```

## Data Flow: Feature Unlock

```
[onReady()]   → CritService: ProgressionService.register('crit', { generatorsOwned: 5 })
[GeneratorChanged] → ProgressionService checks all registered conditions
                   → threshold met → Events.FeatureUnlocked { featureId: 'crit' }
                   → CritService: registers its upgrade actions in ActionService
```

## Data Flow: Modifier Pipeline

```
addGain(rawAmount, source)
  → _modifiers (sorted by priority, highest first):
      [priority 10] CritService lambda  → rolls crit, may fire CritTriggered
      [priority  0] FrenzyService lambda → applies multiplier if active
  → _gold += finalAmount
  → Events.GainApplied { amount, source }
  → Events.ResourceChanged { amount }
```

## Action ID Conventions

| Prefix | Owner | Example |
|--------|-------|---------|
| `generator.buy.{id}` | GeneratorService | `generator.buy.0` |
| `generator.upgrade.{id}` | GeneratorService | `generator.upgrade.1` |
| `upgrade.buy.{id}` | TapService | `upgrade.buy.0` |
| `crit.*` | CritService | `crit.chance.1` |
| `frenzy.*` | FrenzyService | `frenzy.power.1` |
| `interest.*` | InterestService | `interest.rate.1` |
| `vault.*` | VaultService | `vault.bonus.2` |

## Extension Hooks

| Event | When fired | Use case |
|-------|-----------|---------|
| `Events.PlayerTap` | Every tap | Frenzy counter, tap VFX |
| `Events.GainApplied` | Every credited gain | Floating text, progression tracking |
| `Events.CritTriggered` | Crit fires | "CRIT!" VFX, flash effect |
| `Events.FrenzyStarted/Ended` | Frenzy state change | Timer UI, glow effect |
| `Events.ResourceChanged` | Any gold change | HUD update, shop affordability |
| `Events.GeneratorChanged` | Generator count change | Shop update, cycle visual |
| `Events.UpgradePurchased` | Upgrade bought | Milestone popup |
| `Events.FeatureUnlocked` | Milestone reached | Feature slide-in animation |
| `Events.Tick` | Every TICK_INTERVAL | Generator cycle, interest/vault timer |
| `Events.ActionRegistryChanged` | Action list changes | Shop UI rebuild |
