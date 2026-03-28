# H2_Timestop — Claude Code Context

## Project

Mobile **portrait** single-player game built with **Meta Horizon Worlds SDK** (TypeScript).
Platform: Meta Horizon Studio · Language: TypeScript ES2022 · Target: mobile portrait, local single-player.

Skill files with deeper reference material: `Assistant/skills/SKILLS.md`

---

## Execution Model

ALL gameplay runs **client-side only**. The server context is never used for logic.

Every `Component.onStart()` must guard at the top:

```typescript
@subscribe(OnEntityStartEvent)
onStart(): void {
  if (NetworkingService.get().isServerContext()) return;
  // client-only code below
}
```

Spawned entities always use `NetworkMode.LocalOnly`:

```typescript
await WorldService.get().spawnTemplate(asset, {
  position: new Vec3(x, y, z),
  rotation: Quaternion.identity,
  scale: Vec3.one,
  networkMode: NetworkMode.LocalOnly,
});
```

---

## Architecture

### Communication: Event-Driven, No Direct References

Components **never hold references to each other**. All inter-component communication uses `LocalEvent`.

```typescript
// Dispatch an event
EventService.sendLocally(Events.SomethingHappened, { value: 42 });

// Subscribe to an event
@subscribe(Events.SomethingHappened)
private onSomethingHappened(payload: Events.SomethingHappenedPayload): void {
  // react to the event
}
```

Benefits: every component is independently replaceable; new systems plug in without touching existing code.

### Singleton Managers

Pure-logic managers (not Components) use the lazy singleton pattern:

```typescript
export class MyManager {
  private static _instance: MyManager;
  private constructor() {}

  static get(): MyManager {
    if (!MyManager._instance) MyManager._instance = new MyManager();
    return MyManager._instance;
  }

  dispose(): void {
    // reset all state
    MyManager._instance = undefined!;
  }
}
```

Call `Manager.dispose()` on all singletons when restarting or changing levels.

### Modularity Rules

1. No direct component references — events only
2. One class per file; file name matches class name
3. `Types.ts` and `Constants.ts` must not import from any sibling files in the same feature
4. Cross-feature shared code goes in `Scripts/Shared/`
5. A manager orchestrates; a gameplay object handles its own behavior — neither does the other's job

---

## Key SDK APIs

### Component Skeleton

```typescript
import {
  Component, OnEntityStartEvent, NetworkingService,
  TransformComponent, EventService,
  component, property, subscribe,
} from 'meta/worlds';

@component()
export class MyComponent extends Component {
  @property() private myValue: number = 1;      // inspector-tunable
  private _transform!: TransformComponent;       // set in onStart, safe to use after

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
  }
}
```

### Per-Frame Update

```typescript
import { OnWorldUpdateEvent, OnWorldUpdateEventPayload, ExecuteOn, subscribe } from 'meta/worlds';

@subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
onUpdate(payload: OnWorldUpdateEventPayload): void {
  if (!this._isClient) return;
  const dt = payload.deltaTime;   // seconds since last frame
}
```

### Transform

```typescript
const t = this.entity.getComponent(TransformComponent)!;
t.position.set(new Vec3(x, y, z));   // local position
t.worldPosition                       // world position (read-only Vec3)
t.scale.set(new Vec3(sx, sy, sz));
t.rotation.set(Quaternion.fromEulerAngles(rx, ry, rz));
```

### Color

```typescript
import { ColorComponent, Color } from 'meta/worlds';
const c = this.entity.getComponent(ColorComponent)!;
c.color = new Color(r, g, b);         // r/g/b in [0, 1]
```

### Spawning

```typescript
import { WorldService, NetworkMode, TemplateAsset } from 'meta/worlds';
const entity = await WorldService.get().spawnTemplate(myTemplateAsset, {
  position: new Vec3(x, y, z),
  rotation: Quaternion.identity,
  scale:    Vec3.one,
  networkMode: NetworkMode.LocalOnly,
});
```

### Template Assets (in Assets.ts)

```typescript
import { TemplateAsset } from 'meta/worlds';
export const MyAssets = {
  Foo: new TemplateAsset('../Templates/Foo.hstf'),
} as const;
```

### Camera Setup (in ClientSetup.ts)

```typescript
import { CameraService, CameraMode, CameraComponent, TransformComponent } from 'meta/worlds';
// ExecuteOn.Everywhere ensures this runs before client-only guards
@subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
onStart(): void {
  CameraService.get().setCameraMode(CameraMode.Fixed, {
    position: cameraTransform.worldPosition,
    rotation: cameraTransform.worldRotation,
    duration: 0,
    fov: 60,
  });
}
```

### Input / Touch

```typescript
import { FocusedInteractionService } from 'meta/worlds';
// Call once (typically in ClientSetup) to enable touch input
FocusedInteractionService.get().enableFocusedInteraction({
  disableEmotesButton: true,
  disableFocusExitButton: true,
});
```

### HUD / UI (XAML + CustomUiComponent)

```typescript
import { CustomUiComponent } from 'meta/worlds';
// In onStart:
this._ui = this.entity.getComponent(CustomUiComponent)!;
// Update a binding:
this._ui.dataModel.score = 42;
// In XAML template: <Label text="{score}" />
```

### Events Pattern (defined in Types.ts)

```typescript
import { LocalEvent } from 'meta/worlds';

export namespace Events {
  export class PlayerDiedPayload {}
  export const PlayerDied = new LocalEvent<PlayerDiedPayload>('EvPlayerDied', PlayerDiedPayload);

  export class ScoreChangedPayload {
    readonly points: number = 0;   // all fields must have default values
  }
  export const ScoreChanged = new LocalEvent<ScoreChangedPayload>('EvScoreChanged', ScoreChangedPayload);
}
```

Rules for payloads:
- All fields **must** have default values
- Use `@serializable()` decorator if the payload contains `Vec3`, `Color`, or other SDK value types
- Event string IDs must be **globally unique** — always prefix with `Ev`

---

## Coordinate System

Right-Handed Y-Up (RUB):

| Axis | Positive direction | Negative direction |
|------|-------------------|--------------------|
| X    | right             | left               |
| Y    | up                | down               |
| Z    | backward          | forward            |

Play area (portrait mobile): **9 × 16 world units**, centered on origin.
Defined in `Scripts/Constants.ts` as `BOUNDS`, `WIDTH`, `HEIGHT`.

---

## File Organization

```
Scripts/
  Types.ts                ← ALL interfaces, enums, events, payloads — no sibling imports
  Constants.ts            ← BOUNDS, play-area dimensions — no sibling imports
  CollisionManager.ts     ← Generic AABB collision singleton (reuse as-is)
  Assets.ts               ← ALL TemplateAsset references
  ClientSetup.ts          ← Camera + touch input init (runs on all contexts)
  GameManager.ts          ← Lives, score, level progression, win/lose conditions
  LevelConfig.ts          ← Per-level tuning: layout, physics, colors, etc.
  GameHUD/
    GameHUDViewModel.ts   ← XAML ViewModel; subscribes to HUDEvents only
  GameplayObjects/
    [YourObject].ts       ← One component per file
  Shared/                 ← Cross-feature utilities (add only when truly shared)

Templates/
  GameplayObjects/        ← .hstf entity templates created in Horizon Studio
  [Other folders as needed]

Assistant/skills/         ← Reference docs for Claude (architecture, standards, etc.)
Docs/                     ← Human-readable project docs
.llms/rules/              ← LLM-specific rules (log debugging, skill authoring)
```

---

## Coding Standards

| Element | Convention | Example |
|---------|------------|---------|
| Class | PascalCase | `GameManager`, `PlayerController` |
| Interface | PascalCase + `I` prefix | `ICollider`, `IInteractable` |
| Enum | PascalCase, explicit numeric values | `State { Idle = 0, Moving = 1 }` |
| Private field | camelCase + `_` prefix | `_velocity`, `_health` |
| `@property()` field | camelCase, no prefix | `moveSpeed`, `maxHealth` |
| Event string ID | `Ev` prefix | `'EvPlayerDied'`, `'EvRestart'` |
| Module constant | UPPER_SNAKE_CASE | `BOUNDS`, `MAX_SPEED` |

- All internal fields and methods: `private`
- Fields guaranteed to be set in `onStart`: use definite assignment `!`: `private _transform!: TransformComponent`
- Unused parameters: prefix with `_`: `onReset(_p: Events.ResetPayload)`
- Never use `any`. Use `unknown` and narrow if the type is genuinely unknown
- Use `import type` for compile-time-only types
- `const` by default; `let` only when reassignment is needed
- Comments only for non-obvious logic — never restate what the code does

---

## Common Pitfalls

| Pitfall | Correct approach |
|---------|-----------------|
| Forgetting the server guard in `onStart` | Every `onStart` must check `isServerContext()` first |
| `Types.ts` importing from a sibling file | `Types.ts` has zero local imports |
| Magic numbers scattered in gameplay code | Shared constants in `Constants.ts`; per-instance tuning in `@property()` |
| Forgetting `dispose()` on restart | Call `dispose()` on every singleton manager when resetting the game |
| Spawning without `NetworkMode.LocalOnly` | All spawns must be local-only for single-player |
| Holding a reference to another component | Store nothing; communicate only through events |
| Payload fields without default values | Every `LocalEvent` payload field needs a default value |

---

## Debugging — Log Locations (Windows)

| Log | Path | Use for |
|-----|------|---------|
| Editor | `%USERPROFILE%\AppData\Local\Temp\horizon_editor` | Editor crashes, script errors |
| Asset Hub | `%USERPROFILE%\AppData\Local\Temp\asset_hub_app` | Asset import/processing errors |
| World App | `%USERPROFILE%\AppData\Local\Temp\world_app` | Preview mode runtime errors |

Navigate to: latest date folder → largest session number subfolder → log files inside.
