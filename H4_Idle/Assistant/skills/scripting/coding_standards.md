---
name: coding-standards
summary: H4_Idle TypeScript conventions and patterns to follow strictly
include: always
---

# Coding Standards — H4_Idle

## Naming

| Element | Convention | Example |
|---------|------------|---------|
| Class | PascalCase | `ResourceService`, `ShopViewModel` |
| Interface | `I` prefix | `IGeneratorDef`, `IActionDef` |
| Enum | PascalCase, explicit values | `ResourceType { Gold = 0 }` |
| Private field | `_` prefix | `_gold`, `_multiplier` |
| `@property()` | camelCase, no prefix | `generatorId`, `initDelay` |
| Event string ID | `Ev` prefix, globally unique | `'EvResourceChanged'`, `'EvTick'` |
| Module constant | UPPER_SNAKE_CASE | `BASE_CLICK_VALUE`, `TICK_INTERVAL` |
| Unused param | `_` prefix | `onTick(_p: Events.TickPayload)` |

## File Rules

- One class per file; file name matches class name exactly
- `Types.ts` and `Constants.ts` have **zero** local imports
- All `TemplateAsset` refs declared in `Assets.ts`

---

## Component Skeleton

```typescript
@component()
export class MyComponent extends Component {
  @property() myValue: number = 1;
  private _transform!: TransformComponent;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return; // ALWAYS first line
    this._transform = this.entity.getComponent(TransformComponent)!;
  }
}
```

---

## Service Skeleton (with action declarations)

```typescript
@service()
export class MyFeatureService extends Service {
  private _state: number = BASE_VALUE;

  // ── Startup: declare all actions ──────────────────────────────────────────────

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    const unlockDef = getActionDef('myfeature.unlock');
    ActionService.get().declare('myfeature.unlock', () => ({
      label    : unlockDef.label,
      detail   : `${unlockDef.description} [current: ${this._state}]`,
      cost     : unlockDef.cost,
      isEnabled: ResourceService.get().canAfford(unlockDef.cost),
    }));

    const upgradeDef = getActionDef('myfeature.upgrade');
    ActionService.get().declare('myfeature.upgrade', () => ({
      label    : upgradeDef.label,
      detail   : `${upgradeDef.description} [${this._state} -> ${this._state + DELTA}]`,
      cost     : getScaledCost('myfeature.upgrade'),
      isEnabled: ResourceService.get().canAfford(getScaledCost('myfeature.upgrade')),
    }));
  }

  // ── Action handling ───────────────────────────────────────────────────────────

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (!p.id.startsWith('myfeature.')) return;

    if (p.id === 'myfeature.unlock') {
      if (!ResourceService.get().buy(p.id)) return;
      // register modifier, enable passive, etc.
      return;
    }

    if (p.id === 'myfeature.upgrade') {
      if (!ResourceService.get().buy(p.id)) return;
      this._state += DELTA;
      ActionService.get().refreshDeclared(); // update factories with new this._state
    }
  }
}
```

### Key rules for services:

1. **`declare()` in `onReady()`** — all actions declared at startup; factories are closures on `this`
2. **`ResourceService.buy(id)`** — standard purchase: `spend(scaledCost) + StatsService.increment(id)`; returns false if insufficient
3. **`refreshDeclared()` after state change** — call explicitly after updating `this._state` so factories reflect new values (auto-refresh from `buy()` fires BEFORE the state update)
4. **No `unregister()` for maxed actions** — ActionService handles cleanup automatically via `_isMaxed`
5. **No `onResourceChanged()`** — ActionService auto-refreshes affordability; services only handle `ActionTriggered`

---

## ActionDefs Entry Pattern

Every player-facing action must have an entry in `Defs/ActionDefs.ts`:

```typescript
{ id: 'myfeature.unlock',  label: 'Unlock Feature',  description: 'Short description.',  cost: 500,               unlock: { 'gold': 500 } },
{ id: 'myfeature.upgrade', label: 'Upgrade Feature',  description: 'Improves something.', cost: 300, maxCount: 0, unlock: { 'myfeature.unlock': 1 } },
```

| Field | Default | Notes |
|-------|---------|-------|
| `costPow` | `2` | exponential scaling base: `cost × costPow^level` |
| `maxCount` | `1` | `1` = one-time, `0` = unlimited repeatable |
| `unlock` | `undefined` | all conditions must be met simultaneously |

---

## Unlock Condition Keys

```typescript
{ 'gold': 500 }              // current gold ≥ 500 (disappears if spent)
{ 'gold_earned': 1000 }      // cumulative gold earned ≥ 1000 (monotonic)
{ 'taps': 150 }              // total taps ≥ 150
{ 'generator.0': 10 }        // owns ≥ 10 of generator 0
{ 'myfeature.unlock': 1 }    // myfeature.unlock purchased ≥ 1 time
{ 'crit.proc': 10 }          // crit fired ≥ 10 times
// Multiple conditions = ALL must be met simultaneously
{ 'myfeature.unlock': 1, 'crit.proc': 10 }
```

---

## Events

```typescript
// Declare payload (in Types.ts, inside Events namespace)
export class MyPayload { value: number = 0; }  // ALL fields must have defaults
export const MyEvent = new LocalEvent<MyPayload>('EvMyEvent', MyPayload); // 'Ev' prefix, globally unique

// Fire
EventService.sendLocally(Events.MyEvent, { value: 42 });

// Subscribe
@subscribe(Events.MyEvent)
onMyEvent(p: Events.MyPayload): void { ... }
```

- `LocalEvent` for client-only (no `@serializable()` on payload)
- Never hold references between components — use events

---

## Spawning

```typescript
const entity = await WorldService.get().spawnTemplate({
  templateAsset: myTemplate,
  position: new Vec3(x, y, z),
  rotation: Quaternion.identity,
  scale: Vec3.one,
  networkMode: NetworkMode.LocalOnly, // ALWAYS
});
```

## Transform Mutations

```typescript
t.localPosition = new Vec3(x, y, z); // ✅
t.localPosition.x = 5;               // ❌ SDK ignores in-place mutation
```

---

## Do Not

- Use `any`
- Call `dispose()` on a `@service()` — services are singletons, never dispose them
- Import siblings from `Types.ts` or `Constants.ts`
- Run active code at module load — wait for `OnServiceReadyEvent` or `OnEntityStartEvent`
- Call `onResourceChanged()` in a feature service — ActionService handles it automatically
- Call `unregister()` for maxed actions — `refreshDeclared()` handles cleanup
- Skip the `isServerContext()` guard in component `onStart()`
