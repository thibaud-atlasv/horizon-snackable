---
name: new-service
summary: Step-by-step guide for creating a new singleton Service in the Breakout project
include: on-demand
---

# Creating a New Service

Services are singleton managers that run without a scene entity. Use a service when the feature is **stateless relative to the scene** (no transform, no entity ownership needed) and needs to be globally accessible.

Existing examples: `AudioManager`, `CameraShakeService`, `BallPowerService`, `JuiceService`, `VfxService`, `CoinService`.

If the feature needs a scene entity (e.g. for `@property()` inspector fields or network event ownership), use a **Component** instead — see `LeaderboardManager` as a reference.

---

## Step 1 — Create the file

Create `Scripts/Services/MyService.ts`. Follow the naming convention: `PascalCase`, file name = class name.

```typescript
import {
  Service, service, subscribe,
  OnWorldUpdateEvent, OnWorldUpdateEventPayload,
  WorldService,
} from 'meta/worlds';

@service()
export class MyService extends Service {

  // ── State ────────────────────────────────────────────────────────
  private _someValue: number = 0;

  // ── Public API ───────────────────────────────────────────────────

  /** Read-only access for other systems. */
  get someValue(): number { return this._someValue; }

  // ── Event subscribers ────────────────────────────────────────────

  @subscribe(Events.SomeEvent)
  private onSomeEvent(p: Events.SomeEventPayload): void {
    // React to gameplay events
  }

  // ── Per-frame update (optional) ──────────────────────────────────

  @subscribe(OnWorldUpdateEvent)
  private onUpdate(p: OnWorldUpdateEventPayload): void {
    const dt = p.deltaTime;
    // Per-frame logic
  }
}
```

### Key rules

| Rule | Reason |
|---|---|
| Use `@service()` decorator + `extends Service` | Runtime creates the singleton automatically |
| Access via `MyService.get()` | Lazy singleton pattern provided by the `@service()` decorator |
| No server context check needed | Services run on client only (no entity = no network replication) |
| All fields `private`, expose via getters | Follows project code style |
| Communicate via events, not direct references | Other components should not import the service to call methods — fire events instead, unless it's a read-only query (e.g. `BallPowerService.get().speedMultiplier`) |

---

## Step 2 — Add events if needed

If the service introduces new gameplay events, declare them in `Types.ts`:

```typescript
// Types.ts — inside Events namespace
@serializable()
export class MyFeatureActivatedPayload {
  readonly intensity: number = 0;
}
export const MyFeatureActivated = new LocalEvent<MyFeatureActivatedPayload>(
  'EvMyFeatureActivated', MyFeatureActivatedPayload,
);
```

See [events.md](events.md) for the full event creation guide.

---

## Step 3 — Wire it up

Other components or services subscribe to the events your service fires:

```typescript
// In some other component
@subscribe(Events.MyFeatureActivated)
private onMyFeatureActivated(p: Events.MyFeatureActivatedPayload): void {
  // React
}
```

Or read state directly for per-frame queries:

```typescript
const value = MyService.get().someValue;
```

---

## Step 4 — Add constants

If the service has tuning values shared across files, add them to `Constants.ts`:

```typescript
export const MY_FEATURE_RADIUS = 3.0;
export const MY_FEATURE_DURATION = 0.5;
```

Values only used inside the service stay as private constants in the service file.

---

## Checklist

- [ ] File created at `Scripts/Services/MyService.ts`
- [ ] `@service()` decorator + `extends Service`
- [ ] Events declared in `Types.ts` (if new events needed)
- [ ] Shared constants added to `Constants.ts`
- [ ] Service accessed via `.get()` from consuming code
- [ ] Architecture skill updated in `architecture.md` folder listing
