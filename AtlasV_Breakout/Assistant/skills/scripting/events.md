---
name: events
summary: How to declare, dispatch, and subscribe to typed events in the Breakout event system
include: on-demand
---

# Event System Guide

All cross-component communication uses typed events dispatched via `EventService`. Components never hold direct references to each other.

---

## Event Types

| Type | Class | Scope | Use for |
|---|---|---|---|
| **LocalEvent** | `LocalEvent<T>` | Same client only | All gameplay events (ball, brick, paddle, HUD, etc.) |
| **NetworkEvent** | `NetworkEvent<T>` | All clients + server | Leaderboard submission, data broadcast |

Most events are `LocalEvent`. Only use `NetworkEvent` when the server must participate (e.g. leaderboard, persistent state).

---

## Declaring a New Event

### Step 1 — Create the payload class in `Types.ts`

Payloads go inside an `Events` namespace (or a domain-specific namespace like `HUDEvents`, `ComboHUDEvents`, etc.).

```typescript
// Types.ts — inside the Events namespace

@serializable()   // Required only for NetworkEvent payloads
export class MyFeaturePayload {
  readonly position: Vec3 = Vec3.zero;   // All fields MUST have defaults
  readonly intensity: number = 0;
}
export const MyFeature = new LocalEvent<MyFeaturePayload>('EvMyFeature', MyFeaturePayload);
```

### Rules

| Rule | Reason |
|---|---|
| All payload fields must have default values | Horizon serialization requires it |
| Use `readonly` on payload fields | Payloads are immutable value objects |
| Event string ID prefixed with `Ev` | Convention: `'EvBallLost'`, `'EvRestart'` |
| `@serializable()` only on `NetworkEvent` payloads | Local payloads don't need serialization |
| `@property()` on fields of `NetworkEvent` payloads | Required for network serialization |

---

## Step 2 — Dispatch the event

From any component or service:

```typescript
// Local event (same client)
EventService.sendLocally(Events.MyFeature, {
  position: this._transform.worldPosition,
  intensity: 0.5,
});

// Network event (all clients + server)
EventService.sendGlobally(LeaderboardEvents.LeaderboardSubmitScore, {
  score: this._score,
});
```

---

## Step 3 — Subscribe to the event

In any component or service:

```typescript
@subscribe(Events.MyFeature)
private onMyFeature(p: Events.MyFeaturePayload): void {
  // Handle the event
}
```

For events that should run on both client and server (e.g. leaderboard):

```typescript
@subscribe(LeaderboardEvents.LeaderboardSubmitScore, { execution: ExecuteOn.Everywhere })
async onSubmitScore(p: LeaderboardEvents.LeaderboardSubmitScorePayload): Promise<void> {
  if (!NetworkingService.get().isServerContext()) return;
  // Server-only logic
}
```

---

## Existing Event Namespaces

| Namespace | Purpose | Examples |
|---|---|---|
| `Events` | Core gameplay | `BallLost`, `BrickDestroyed`, `PaddleHit`, `LoadLevel`, `ResetRound`, `Restart`, `LevelCleared`, `InitBrick`, `BrickHit`, `ExplosionChain`, `CoinCollected`, `PowerUpCollected`, `StickyPaddleActivated/Deactivated`, `ReleaseBall`, `BrickRecycle` |
| `HUDEvents` | Score/lives/message display | `UpdateScore`, `UpdateLives`, `ShowMessage`, `HideMessage` |
| `ComboHUDEvents` | Combo counter | `IncrementCombo`, `ResetCombo` |
| `HeatEvents` | Heat (ball power) tracking | `IncrementHeat`, `ResetHeat` |
| `HighScoreHUDEvents` | Leaderboard overlay | `ShowHighScores`, `HideHighScores` |
| `LeaderboardEvents` | Network leaderboard | `LeaderboardSubmitScore` (NetworkEvent), `LeaderboardEntriesFetched` (NetworkEvent), `LeaderboardDisplayRequest` (LocalEvent) |
| `BackgroundEvents` | Background animation | `IntensifyBackground` |

---

## When to Create a New Namespace

Create a new namespace when your feature is a **self-contained domain** with multiple related events (e.g. `MyFeatureHUDEvents` for a new HUD overlay with show/hide).

If the event is a core gameplay event (ball, brick, paddle, coin), add it to the existing `Events` namespace.

---

## Checklist

- [ ] Payload class declared in `Types.ts` with default values on all fields
- [ ] Event constant created with `new LocalEvent<T>('EvName', PayloadClass)`
- [ ] String ID prefixed with `Ev` and unique across the project
- [ ] `@serializable()` + `@property()` added if `NetworkEvent`
- [ ] Dispatcher calls `EventService.sendLocally()` or `sendGlobally()`
- [ ] Subscriber uses `@subscribe(Events.Name)` decorator
- [ ] No circular dependencies (Types.ts does not import from sibling files)
