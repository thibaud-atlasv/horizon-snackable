---
name: balancing
summary: Guide to tuning balance, scaling, and adding upgrades to existing systems in H4_Idle
include: on-demand
---

# Balancing & Scaling — H4_Idle

---

## Where Numbers Live

| What | File | Notes |
|------|------|-------|
| Base values (click, crit chance, frenzy threshold…) | `Constants.ts` | One place, named constants only |
| Action cost, costPow, maxCount, unlock thresholds | `ActionDefs.ts` | Source of truth for all economy |
| Generator output, cycle time, upgrade multipliers | `GeneratorDefs.ts` | Production stats only |
| Per-upgrade delta (how much each upgrade improves a stat) | Owning service `onActionTriggered` | e.g. `this._chance += 0.05` |

**Never put magic numbers in service code.** If a tuning value appears in a service, it belongs in `Constants.ts`.

---

## Constants.ts Reference

```typescript
BASE_CLICK_VALUE     = 1       // gold per tap before multipliers
TICK_INTERVAL        = 0.1     // seconds between Tick events (don't change — affects all timers)
BASE_CRIT_CHANCE     = 0.05    // 5% base crit probability
BASE_CRIT_MULTIPLIER = 2.5     // ×2.5 on crit
FRENZY_TAP_THRESHOLD = 25      // taps to trigger frenzy
FRENZY_DURATION      = 10      // seconds frenzy lasts
FRENZY_MULTIPLIER    = 2       // ×2 during frenzy
BASE_INTEREST_RATE   = 0.01    // 1% of current gold per interval
BASE_INTEREST_INTERVAL = 30    // seconds between payouts
BASE_VAULT_DURATION  = 30      // seconds vault locks gold
BASE_VAULT_BONUS     = 1.5     // ×1.5 on collect (+50%)
```

---

## Cost Scaling Formula

```
cost(n) = baseCost × costPow ^ n
```

Where `n` = `StatsService.get(actionId)` = number of times already purchased.

| costPow | Feeling | Use case |
|---------|---------|---------|
| `1.0` | flat (no scaling) | one-time purchases |
| `1.10–1.15` | gentle curve | generators (long-term repeatables) |
| `1.5–2.0` | steep | tap/crit upgrades (diminishing returns intended) |
| `2.0` (default) | exponential | generic upgrades |

### Adjusting generator cost curve

In `ActionDefs.ts`:
```typescript
{ id: 'generator.buy.0', ..., cost: 15,  costPow: 1.15, ... }
{ id: 'generator.buy.1', ..., cost: 1100, costPow: 1.15, ... }
```

`costPow: 1.15` means the 10th farm costs `15 × 1.15^10 ≈ 60g`. The 50th costs `≈ 1 750g`.

### Adjusting upgrade cost curve

In `ActionDefs.ts`, for repeatable upgrades (`maxCount: 0`):
```typescript
{ id: 'crit.chance', ..., cost: 500, /* costPow defaults to 2 */ }
// Level 0: 500g, Level 1: 1000g, Level 2: 2000g, Level 3: 4000g …
```

For one-time upgrades (`maxCount: 1`, default): `costPow` is irrelevant (always level 0).

---

## Unlock Thresholds

Unlock conditions gate when an action first appears. Adjust in `ActionDefs.ts`:

```typescript
unlock: { 'gold': 150 }           // appears when player has 150g on hand
unlock: { 'gold_earned': 5_000 }  // appears after earning 5000g total
unlock: { 'taps': 150 }           // appears after 150 taps
unlock: { 'generator.0': 10 }     // appears when player owns 10 farms
unlock: { 'crit.proc': 10 }       // appears after 10 crits fired
```

**Tips:**
- Use `gold` for "appears when affordable" (early game, low cost)
- Use `gold_earned` for mid/late objectives (monotonic — won't disappear if spent)
- Combine keys for precision: `{ 'myfeature.unlock': 1, 'crit.proc': 30 }` — both required

---

## Generator Production Tuning

In `GeneratorDefs.ts`:

```typescript
{ id: 0, name: 'Farm',
  baseOutput: 2.5,    // gold per cycle per unit owned
  cycleTime: 5,       // seconds between production ticks
  upgradeMultipliers: [2, 3, 4.5, 6.75, 10.125, ...] }
```

**Gold per second (GPS) per unit:**  `baseOutput / cycleTime = 2.5 / 5 = 0.5 gps`

**With upgrades compounded:**
- After rank 0 (×2): `0.5 × 2 = 1 gps`
- After rank 1 (×3): `0.5 × 2 × 3 = 3 gps`
- After rank 2 (×4.5): `0.5 × 6 × 4.5 = 13.5 gps`

To make a generator stronger: raise `baseOutput` or lower `cycleTime`.  
To make upgrades more impactful: raise values in `upgradeMultipliers`.

**Multiplier chain guideline (10 ranks):**

```
[2, 3, 4.5, 6.75, 10.125, 15.1875, 22.78, 34.17, 51.26, 76.9]
```

Each entry is roughly ×1.5 the previous — a sustained exponential curve. Adjust the multipliers to speed up or slow down late-game scaling.

---

## Adding Upgrades to an Existing Feature

To add more upgrade levels to an existing feature (e.g. a 3rd crit upgrade):

### Step 1 — `ActionDefs.ts`

Add the entry in the correct feature section:

```typescript
// In CRIT_DEFS:
{ id: 'crit.devastate', label: 'Devastating Crits', description: 'Increase crit damage further.',
  cost: 5_000, maxCount: 0, unlock: { 'crit.unlock': 1, 'crit.proc': 50 } },
```

### Step 2 — `Constants.ts` (if a new delta is needed)

```typescript
export const CRIT_DEVASTATE_BONUS = 1.0; // +1.0 multiplier per purchase
```

### Step 3 — Owning service `onReady()`

```typescript
const devastateDef = getActionDef('crit.devastate');
ActionService.get().declare('crit.devastate', () => ({
  label    : devastateDef.label,
  detail   : `${devastateDef.description} [x${this._multiplier} -> x${parseFloat((this._multiplier + CRIT_DEVASTATE_BONUS).toFixed(1))}]`,
  cost     : getScaledCost('crit.devastate'),
  isEnabled: ResourceService.get().canAfford(getScaledCost('crit.devastate')),
}));
```

### Step 4 — Owning service `onActionTriggered()`

```typescript
if (p.id === 'crit.devastate') {
  if (!ResourceService.get().buy(p.id)) return;
  this._multiplier += CRIT_DEVASTATE_BONUS;
  ActionService.get().refreshDeclared();
}
```

No other files need changes.

---

## Per-Feature Balance Levers

### Tap / Cursor

| Lever | Where | Effect |
|-------|-------|--------|
| `BASE_CLICK_VALUE` | Constants | Base gold per tap |
| `tap.upgrade` cost/costPow | ActionDefs | Cost of each multiplier level |
| `tap.upgrade` delta (`+= 1`) | TapService.onActionTriggered | How much each upgrade adds |
| `tap.buy` maxCount (10) | ActionDefs | Max cursor count |
| `CURSOR_CYCLE_TIME` (2s) | TapService | Auto-click rate |

### Crit

| Lever | Where | Effect |
|-------|-------|--------|
| `BASE_CRIT_CHANCE` (5%) | Constants | Starting crit probability |
| `BASE_CRIT_MULTIPLIER` (×2.5) | Constants | Starting crit damage |
| `crit.chance` delta (`+= 0.05`) | CritService | Per-upgrade chance increase |
| `crit.power` delta (`+= 0.5`) | CritService | Per-upgrade multiplier increase |
| `crit.chance` / `crit.power` costs | ActionDefs | Affordability curve |
| `crit.proc: 10/30` unlock thresholds | ActionDefs | When deeper upgrades appear |

### Frenzy

| Lever | Where | Effect |
|-------|-------|--------|
| `FRENZY_TAP_THRESHOLD` (25) | Constants | Taps to trigger |
| `FRENZY_DURATION` (10s) | Constants | Base frenzy duration |
| `FRENZY_MULTIPLIER` (×2) | Constants | Base frenzy multiplier |
| `frenzy.threshold` delta (`Math.max(5, n - 2)`) | FrenzyService | Tap threshold reduction per upgrade |
| `frenzy.duration` delta (`+= 3`) | FrenzyService | Seconds added per upgrade |
| `frenzy.power` delta (`+= 0.5`) | FrenzyService | Multiplier increase per upgrade |
| `frenzy.activated: 3/5/10` thresholds | ActionDefs | When upgrade chain unlocks |

### Interest

| Lever | Where | Effect |
|-------|-------|--------|
| `BASE_INTEREST_RATE` (1%) | Constants | Starting interest per interval |
| `BASE_INTEREST_INTERVAL` (30s) | Constants | Starting interval |
| `interest.rate` delta (`+= 0.005`) | InterestService | Rate increase per upgrade |
| `interest.interval` delta (`Math.max(10, n - 10)`) | InterestService | Interval reduction per upgrade |
| `gold_earned: 1_000` unlock threshold | ActionDefs | When interest appears |
| `interest.payout: 3/10` thresholds | ActionDefs | When upgrade chain unlocks |

### Vault

| Lever | Where | Effect |
|-------|-------|--------|
| `BASE_VAULT_DURATION` (30s) | Constants | Starting lock duration |
| `BASE_VAULT_BONUS` (×1.5) | Constants | Starting return bonus |
| `vault.duration` delta (`Math.max(10, n - 15)`) | VaultService | Duration reduction per upgrade |
| `vault.bonus` delta (`+= 0.2`) | VaultService | Bonus multiplier per upgrade |
| `gold_earned: 5_000` unlock threshold | ActionDefs | When vault appears |
| `vault.lock: 1/3` thresholds | ActionDefs | When upgrade chain unlocks |

---

## Progression Pacing Reference

Approximate gold milestones where features appear:

```
   0g  — Tap available
  15g  — Farm appears (gold: 15)
  50g  — First farm bought → Cursor unlock available (generator.0: 1, taps: 50)
 150g  — Crit unlock appears (gold: 150)
 400g  — Frenzy unlock appears (taps: 150)
1 100g — Mine appears (generator.0: 10)
2 000g — Interest unlock appears (gold_earned: 1 000)
8 000g — Vault unlock appears (gold_earned: 5 000)
```

When rebalancing, verify these milestones feel smooth:
1. Player can afford the first farm quickly (within 30–60 taps)
2. Each new feature appears shortly after the player has gold to afford it
3. Generator upgrade chains provide meaningful bumps, not flat progression
4. Late features (interest, vault) require real investment, not immediate purchase

---

## Quick Balance Recipes

### "Game is too fast early"
- Raise `generator.buy.0` base cost (currently 15g)
- Raise `tap.buy` and `tap.upgrade` unlock thresholds

### "Game stalls mid-game"
- Lower mine cost or reduce `generator.0: 10` unlock requirement
- Lower interest unlock threshold (`gold_earned: 1_000` → `500`)
- Add an intermediate generator between Farm and Mine

### "Late game upgrades feel pointless"
- Raise generator upgrade multipliers (last few ranks)
- Add more upgrade ranks to existing features (see "Adding Upgrades" above)
- Lower vault bonus and raise it with more upgrades

### "Frenzy is too rare / too common"
- `FRENZY_TAP_THRESHOLD`: lower = more frequent
- `frenzy.threshold` delta: increase to make upgrades more impactful
- `frenzy.activated` unlock threshold: lower to reveal upgrades sooner

### "Crit feels invisible"
- Raise `BASE_CRIT_CHANCE` to 0.10 (10%)
- Lower `crit.proc: 10` threshold so upgrades appear faster
- Raise `BASE_CRIT_MULTIPLIER` to 3.0 or higher
