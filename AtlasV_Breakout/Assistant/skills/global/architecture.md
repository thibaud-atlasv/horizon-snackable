---
name: architecture
summary: Project structure, feature organization, and execution model
include: always
---

# Project Architecture

## Execution Model

All gameplay runs **locally on the client**. Server context is never used for game logic — only `LeaderboardManager` has server-side code for leaderboard submission and fetch.

Every component guards against server execution at the top of `onStart`:

```typescript
@subscribe(OnEntityStartEvent)
onStart(): void {
  if (NetworkingService.get().isServerContext()) return;
  // ...
}
```

Spawned entities always use `NetworkMode.LocalOnly`.

---

## Folder Structure

```
Scripts/
  Assets.ts             ← TemplateAsset references (bricks, particles, power-ups)
  CollisionManager.ts   ← AABB singleton, register/unregister/query
  Constants.ts          ← All shared tuning values (bounds, physics, juice, vfx)
  LevelConfig.ts        ← Level definitions (Title + 11 levels), defaults, types
  Types.ts              ← All enums, interfaces, event namespaces + payloads

  Components/
    BackgroundAnimViewModel.ts
    Ball.ts
    Brick.ts
    ClientSetup.ts
    ComboHUDViewModel.ts
    ComboManager.ts
    ExplosiveBrick.ts
    GameHUDViewModel.ts
    GameManager.ts
    HighScoreHUDViewModel.ts
    LevelLayout.ts
    Paddle.ts
    PaddleEffects.ts
    PowerUp.ts
    PowerUpManager.ts
    StickyBallState.ts

  Services/
    AudioManager.ts
    BallPowerService.ts
    CameraShakeService.ts
    CoinService.ts
    JuiceService.ts
    LeaderboardManager.ts
    VfxService.ts
```

- One class per file. File name = class name.
- `Types.ts` and `Constants.ts` do not import from sibling files.

---

## Communication Pattern

Components **do not hold references to each other**. They communicate exclusively via typed local events.

- Subscribe: `@subscribe(Events.Foo)`
- Dispatch: `EventService.sendLocally(Events.Foo, payload)`

Non-component singletons (`CollisionManager`, `VfxService`, `CoinService`, `AudioManager`, etc.) use the `@service()` decorator or the lazy singleton pattern and are accessed via `ServiceName.get()`.

### Services vs Components

| Type | Decorator | Lifecycle | Use for |
|---|---|---|---|
| **Service** | `@service()` extends `Service` | Singleton, auto-created by runtime | Stateless managers, event routing, pooling |
| **Component** | `@component()` extends `Component` | Attached to a scene entity | Anything that needs a transform, properties, or entity ownership |

`AudioManager`, `CameraShakeService`, `BallPowerService`, `JuiceService`, `VfxService`, `CoinService` are all services.
`LeaderboardManager` is a component (needs entity ownership for network events).

---

## Constants

| Scope | Location |
|---|---|
| Shared across multiple files | `Constants.ts` |
| Tunable per-instance in inspector | `@property()` field on the component |

Never hardcode a value that appears in more than one place.
