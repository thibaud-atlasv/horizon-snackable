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

Each game or feature lives in its own folder under `Scripts/`:

```
Scripts/
  FeatureName/
    Types.ts              ← enums, interfaces, events, payloads
    Constants.ts          ← shared constants for this feature
    FeatureManager.ts     ← orchestration component
    CollisionManager.ts   ← optional: pure logic manager (singleton)
    GameplayObjects/
      Foo.ts
      Bar.ts
  ClientSetup.ts          ← global client entry point
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
