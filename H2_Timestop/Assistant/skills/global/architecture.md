---
name: architecture
summary: Project structure, feature organization, and execution model
include: always
---

# Project Architecture

## Execution Model

All gameplay runs **locally on the client**. Server context is never used.
Every component must guard against server execution at the top of `onStart`:

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
  Types.ts              ← enums, interfaces, events, payloads — no sibling imports
  Constants.ts          ← BOUNDS, play-area dimensions — no sibling imports
  CollisionManager.ts   ← generic AABB singleton (reuse as-is)
  Assets.ts             ← all TemplateAsset references
  ClientSetup.ts        ← camera + touch input init (runs everywhere)
  GameManager.ts        ← lives, score, level progression, win/lose conditions
  LevelConfig.ts        ← per-level tuning: layout, physics, colors, etc.
  GameHUD/
    GameHUDViewModel.ts ← XAML ViewModel, subscribes to HUDEvents only
  GameplayObjects/
    [Object].ts         ← one component per file
  Shared/               ← cross-feature utilities (add only when truly shared)
```

- One class per file. File name = class name.
- `Types.ts` and `Constants.ts` must not import from other files in the same feature.
- Cross-feature code goes in a `Shared/` folder at the `Scripts/` root.

---

## Communication Pattern

Components **do not hold references to each other**. They communicate exclusively via local events.

- Components subscribe to events with `@subscribe(Events.Foo)`.
- Components dispatch events with `EventService.sendLocally(Events.Foo, payload)`.
- This keeps every component independently testable and replaceable.

Non-component managers (e.g. `CollisionManager`) use the lazy singleton pattern and are accessed via `Manager.get()`. They must implement `dispose()` to reset state on restart.

---

## Constants

| Scope | Location |
|---|---|
| Shared across multiple files | `Constants.ts` at feature root |
| Specific to one component | `@property()` field on that component, tunable in the inspector |

Never hardcode a value that appears in more than one place.
