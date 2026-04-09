## Language

All code, comments, documentation, and files in this project must be written in **English**.

---

## Project

Mobile **portrait** single-player game built with **Meta Horizon Worlds SDK** (TypeScript).
Platform: Meta Horizon Studio · Language: TypeScript ES2022 · Target: mobile portrait, local single-player.

The game has to be "snackable" (short session, no required explanation) and follow the 3 S:
 - Simple
 - Satisfying
 - Short

---

## Collaboration

When facing a non-trivial design decision, present options to the user before implementing.
Include trade-offs, not just recommendations. A good prompt looks like:

> "Two approaches here — A does X (simpler, less flexible) vs B does Y (more setup, easier to extend). Which fits better?"

Do not over-engineer in anticipation of unspecified features. Build what is needed now.
**Events, interfaces, and features are added at implementation time — not upfront.**

---

## Execution Model

ALL gameplay runs **client-side only**. The server context is never used for logic.

Every `Component.onStart()` must guard at the top:

```typescript
private _networkingService = NetworkingService.get();

@subscribe(OnEntityStartEvent)
onStart(): void {
  if (this._networkingService.isServerContext()) return;
}
```

Spawned entities always use `NetworkMode.LocalOnly`:

```typescript
const entity = await WorldService.get().spawnTemplate({
  templateAsset: myTemplate,
  position: new Vec3(x, y, z),
  rotation: Quaternion.identity,
  scale: Vec3.one,
  networkMode: NetworkMode.LocalOnly,
});
```

---

## Architecture

### Core Principle: Small, Composable, No Assumptions

Keep the core minimal. Each system does one thing. New features add new files — they don't modify existing ones unless necessary.

Do not add interfaces, events, or abstractions for capabilities not yet implemented.

### Communication: Event-Driven, No Direct References

```typescript
// Broadcast to all subscribers
EventService.sendLocally(Events.EnemyDied, { enemyId: 42, reward: 10 });

// Target a specific entity
EventService.sendLocally(Events.InitEnemy, { defId: 0 }, { eventTarget: entity });

// Subscribe (works in both Component and Service)
@subscribe(Events.EnemyDied)
private onEnemyDied(p: Events.EnemyDiedPayload): void { ... }
```

### Services — Preferred Singleton Pattern

`Service` base class already exposes a polymorphic static `get()` — **do not override it**.
Use `Service.inject(MyService)` or `Service.injectWeak(MyService)` to declare dependencies in other services; access services via `MyService.get()`.

```typescript
import { Service, service, subscribe, OnServiceReadyEvent } from 'meta/worlds';

@service()
export class MyService extends Service {
  // Strong dependency — blocks init until OtherService is ready
  private readonly _other : OtherService = Service.inject(OtherService);
  private readonly _other2 : Maybe<OtherService2> = Service.injectWeak(OtherService2);

  private _data: Map<number, string> = new Map();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    // Safe to call injected services and send events here
  }
}

// Access from any component or service:
const svc = MyService.get();
```

### `Maybe<T>`

`Maybe<T>` is an SDK alias for `T | null`. Use it for fields that are set after construction (e.g. in `onStart`):

```typescript
import type { Maybe } from 'meta/worlds';
private _transform: Maybe<TransformComponent> = null;
```

### `OnEntityCreateEvent` vs `OnEntityStartEvent`

- **`OnEntityCreateEvent`** — fires when the component is attached to its entity. The scene is not fully ready; other entities may not exist yet. Use for self-contained setup that doesn't depend on the scene (e.g. attaching a ViewModel to a `CustomUiComponent`).
- **`OnEntityStartEvent`** — fires after the full scene is initialized. Safe to query other entities, call services, and send events. **Prefer this for all game logic.**

### Assets — Single Source of Truth

`Assets.ts` is the **only** file that contains `new TemplateAsset(...)` calls. Never declare template assets elsewhere.
Never use `@property()` to pass templates — asset paths live in code, not in the editor.

```typescript
// Assets.ts
export namespace Assets {
  export const Arrow  = new TemplateAsset('@Templates/Towers/Arrow.hstf');
  export const EnemyBasic = new TemplateAsset('@Templates/Enemies/Basic.hstf');
  export const Projectile = new TemplateAsset('@Templates/Projectile.hstf');
}
```

Def files reference assets by name — they never construct TemplateAssets directly:

```typescript
// Defs/TowerDefs.ts
import { Assets } from '../Assets';
export const TOWER_DEFS: ITowerDef[] = [
  { id: 'arrow', ..., template: Assets.Arrow },
];
```

Catalog services read def arrays in `onReady()` — def files never call `register()`:

```typescript
@subscribe(OnServiceReadyEvent)
onReady(): void {
  for (const def of TOWER_DEFS) this._defs.set(def.id, def);
}
```

### Content Definition Pattern

New content, or levels are added as entries in definition files or new files — no code changes required elsewhere:

```typescript
// Defs/TowerDefs.ts
export const TOWER_DEFS: ITowerDef[] = [
  { id: TowerType.Arrow, name: 'Arrow', cost: 50, damage: 10, range: 3, fireRate: 1.0 },
];
```

---

## Modularity Rules

- No direct component references (except API components: transform, camera, customui) — events only
- One class per file; file name matches class name
- `Types.ts` and `Constants.ts` must not import from any sibling file
- All template assets declared in `Assets.ts` by path — never via `@property()`
- A service orchestrates; a component handles its own visuals and local behavior

---

## Key SDK APIs

### Component Skeleton

```typescript
import {
  Component, OnEntityStartEvent, NetworkingService,
  TransformComponent, EventService,
  component, subscribe,
} from 'meta/worlds';

@component()
export class MyComponent extends Component {
  @property() myValue: number = 1;  // inspector-tunable, must have default

  private _transform: Maybe<TransformComponent> = null;  // set in onStart

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
  }
}
```

### Per-Frame Update

```typescript
import { OnWorldUpdateEvent, ExecuteOn, subscribe } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';

// ExecuteOn.Owner — runs on owning client only, no extra server guard needed
@subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
onUpdate(payload: OnWorldUpdateEventPayload): void {
  const dt = payload.deltaTime;
}
```

### Transform

```typescript
const t = this.entity.getComponent(TransformComponent)!;
// read/write access
t.localPosition = new Vec3(x, y, z);
t.worldPosition = new Vec3(x, y, z);
t.localScale    = new Vec3(sx, sy, sz);
t.localRotation = Quaternion.fromEuler(new Vec3(rx, ry, rz)); // degrees
```

### Color

```typescript
import { ColorComponent, Color } from 'meta/worlds';
const c = this.entity.getComponent(ColorComponent)!;
c.color = new Color(r, g, b, a); // r/g/b/a in [0, 1]; alpha optional (default 1)
```

### Camera Setup (ClientSetup.ts)

```typescript
@subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
onStart(): void {
  setTimeout(() => {
    FocusedInteractionService.get().enableFocusedInteraction({
      disableEmotesButton: true,
      disableFocusExitButton: true,
    });
    CameraService.get().setCameraMode(CameraMode.Fixed, {
      position: cameraTransform.worldPosition,
      rotation: cameraTransform.worldRotation,
      duration: 0,
      fov: 60,
    });
  }, this.initDelay * 1000);
}

// Touch → local event
@subscribe(OnFocusedInteractionInputStartedEvent)
onTouchStarted(_p: OnFocusedInteractionInputEventPayload): void {
  EventService.sendLocally(Events.SomeTapEvent, {});
}
```

### HUD / UI (XAML + CustomUiComponent + UiViewModel)

```typescript
@uiViewModel()
export class MyHUDData extends UiViewModel {
  gold: number = 0;
  lives: number = 20;
}

// In component:
private _vm = new MyHUDData();

@subscribe(OnEntityStartEvent)
onStart(): void {
  if (NetworkingService.get().isServerContext()) return;
  const ui = this.entity.getComponent(CustomUiComponent);
  if (ui) ui.dataContext = this._vm;
}
// Update: this._vm.gold = 42;  // auto-triggers XAML reactive update
```

UI (XAML) and UiViewModel files are generated by the MHS assistant — do not create them manually.

### Events Pattern (Types.ts)

```typescript
export namespace Events {
  export class EnemyDiedPayload { enemyId: number = 0; reward: number = 0; }
  export const EnemyDied = new LocalEvent<EnemyDiedPayload>('EvEnemyDied', EnemyDiedPayload);
}
```

Rules:
- Event string IDs must be **globally unique** — always prefix with `Ev`
- No `@serializable()` on `LocalEvent` payloads
- All payload fields must have default values
- `@subscribe`-decorated handlers must **not** be `private` — the framework calls them externally; `private` triggers TS6133 "declared but never read"
- Unused parameters: prefix with `_` — `onReset(_p: Events.ResetPayload): void`

---

## Coordinate System

Right-Handed Y-Up (RUB):

| Axis | Positive | Negative |
|------|----------|----------|
| X    | right    | left     |
| Y    | up       | down     |
| Z    | backward | forward  |

Play area (portrait mobile): **9 × 16 world units**, centered on origin.

---

## File Organization

Information about the game will be stored in `Docs\PROJECT_SUMMARY.md`

```
Scripts/
  Types.ts                ← Enums, interfaces, events (added as needed)
  Constants.ts            ← Grid dimensions, play-area bounds, tuning values
  Assets.ts               ← ALL TemplateAsset refs (paths in code, never @property)

  Components/             ← Components: GameManager, ClientSetup, entity controllers
  Services/               ← Services and registries: all singletons, one responsibility each
  Defs/                   ← Static data tables: content definitions, level configs, tuning tables

Templates/
UI/                     ← XAML panels 
Docs/                   ← Game specific details, art direction, project summary
Assistant/
  Skills/               ← Skills for the MHS AI assistant, extensions features should be added there
```

---

## Coding Standards

| Element | Convention | Example |
|---------|------------|---------|
| Class | PascalCase | `EnemyController`, `TowerService` |
| Interface | `I` prefix | `ITowerDef`, `IEnemyDef` |
| Enum | PascalCase, explicit values | `TowerType { Arrow = 0, Cannon = 1 }` |
| Private field | `_` prefix | `_gold`, `_health` |
| `@property()` field | camelCase, no prefix | `defId`, `spawnDelay` |
| Event string ID | `Ev` prefix | `'EvEnemyDied'`, `'EvTowerPlaced'` |
| Module constant | UPPER_SNAKE_CASE | `GRID_COLS`, `ENEMY_BASE_SPEED` |

- `const` by default; `let` only when reassignment is needed
- Never use `any` — use `unknown` with narrowing, or a typed interface
- Use `import type` for compile-time-only types
- Comments only for non-obvious logic

---

## Common Pitfalls

| Pitfall | Correct approach |
|---------|-----------------|
| Forgetting server guard in `onStart` | Every Component `onStart` must check `NetworkingService.get().isServerContext()` |
| `Types.ts` importing from a sibling | `Types.ts` has zero local imports |
| Spawning without `NetworkMode.LocalOnly` | All spawns must be `NetworkMode.LocalOnly` |
| Calling `dispose()` on a `@service()` | Services are singletons — subscribe to a reset event and reassign fields instead: `this._score = 0; this._round = 1;` |
| `static get()` on a derived service | Don't override — use the inherited `MyService.get()` directly |
| Assets via `@property()` | Declare all asset paths in `Assets.ts` with `new TemplateAsset(...)` |
| `t.position.set(...)` on TransformComponent | Use `t.localPosition = new Vec3(...)` or `t.worldPosition = ...` |
| Magic numbers in gameplay code | Named constants in `Constants.ts` |
| Adding events/interfaces "just in case" | Only add what is needed for the current feature |
| Active code on module load | Wait for `OnServiceReadyEvent` or `OnEntityStartEvent` |

---

## Debugging — Log Locations (Windows)

| Log | Path | Use for |
|-----|------|---------|
| Editor | `%USERPROFILE%\AppData\Local\Temp\horizon_editor` | Script errors |
| Asset Hub | `%USERPROFILE%\AppData\Local\Temp\asset_hub_app` | Asset import errors |
| World App | `%USERPROFILE%\AppData\Local\Temp\world_app` | Preview runtime errors |

Navigate to: latest date folder → largest session number subfolder → log files inside.

---

## Full SDK Reference

| API | Path |
|-----|------|
| `meta/worlds` | `C:\Program Files\Meta Horizon Studio STC\v1\asset_hub\sdk_packages\meta\worlds_sdk\index.d.ts` |

Refer to this file only when the pattern above doesn't cover the API you need.
