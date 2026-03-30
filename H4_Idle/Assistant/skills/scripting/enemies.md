---
name: generators-and-upgrades
summary: How generators and upgrades work, and how to add new ones in H4_Idle
include: on-demand
---

# Generators & Upgrades — H4_Idle

## Generator Definition (IGeneratorDef)

```typescript
interface IGeneratorDef {
  id: number;           // unique, sequential
  name: string;
  baseCost: number;     // cost of first purchase
  costMultiplier: number; // each purchase multiplies cost (e.g. 1.15)
  baseOutput: number;   // resources/sec at count=1, before upgrades
  unlockAt: number;     // resource amount required to show in shop
  template: TemplateAsset; // optional visual
}
```

**Cost formula:** `cost(n) = baseCost * costMultiplier^owned`

**Output formula:** `output = baseOutput * owned * upgradeMultiplier`

Add a generator: one entry in `GeneratorDefs.ts` + asset in `Assets.ts`. No other files change.

## Upgrade Definition (IUpgradeDef)

```typescript
interface IUpgradeDef {
  id: number;
  name: string;
  description: string;
  cost: number;
  // What it affects:
  targetGeneratorId?: number; // undefined = affects all / click
  multiplier: number;         // e.g. 2 = double output
  unlockCondition: { generatorId: number; count: number } | { resourceAmount: number };
}
```

Add an upgrade: one entry in `UpgradeDefs.ts`. No other files change.

## UpgradeService — Multiplier Computation

```typescript
getOutputMultiplier(generatorId: number): number {
  // product of all purchased upgrades targeting this generator
}
getClickMultiplier(): number {
  // product of all purchased click upgrades
}
```

Called by `GeneratorService.getTotalOutput()` and `ResourceService` on tap.

## GeneratorService — Total Output

```typescript
getTotalOutput(): number {
  return GENERATOR_DEFS.reduce((sum, def) => {
    const owned = this._counts.get(def.id) ?? 0;
    const mult  = UpgradeService.get().getOutputMultiplier(def.id);
    return sum + def.baseOutput * owned * mult;
  }, 0);
}
```

Called by `GameManager` every `TICK_INTERVAL` seconds to add passive income.
