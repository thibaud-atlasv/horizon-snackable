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

### Communication: Event-Driven, No Direct References

```typescript
// Broadcast to all subscribers
EventService.sendLocally(Events.SomethingHappened, { value: 42 });

// Target a specific entity (e.g. a just-spawned entity)
EventService.sendLocally(Events.InitObj, { objId: 0 }, { eventTarget: entity });

// Subscribe (works in both Component and Service)
@subscribe(Events.SomethingHappened)
private onSomethingHappened(p: Events.SomethingHappenedPayload): void { ... }
```

### Services — Preferred Singleton Pattern

Use `@service()` for all cross-cutting logic and registries. Services auto-initialize, are globally accessible, and can subscribe to events. No `dispose()` needed — reset state in a `@subscribe(Events.Restart)` handler instead.

```typescript
import { Service, service, subscribe, OnServiceReadyEvent } from 'meta/worlds';

@service()
export class MyRegistry extends Service {
  // Strong dependency (blocks init until fulfilled)
  private readonly _other = Service.inject(OtherService);
  // Weak dependency (may be null)
  private readonly _optional = Service.injectWeak(OptionalService);

  private _items: Map<number, IMyInterface> = new Map();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    // Safe to send events and access injected services here
  }

  @subscribe(Events.Restart)
  onRestart(): void {
    this._items.clear();  // Reset state instead of dispose()
  }
}

// Access from any component:
const registry = MyRegistry.get();
```

### Content Extensibility Patterns

Three patterns for adding features without modifying existing files. Use the simplest one that fits.

---

#### A — Registry + Interface (current project pattern)

Enum identifies the type; a `Record` maps it to assets; each object implements an interface. Adding a type = 1 file + 1 line in `Assets.ts` + config in `LevelConfig`.

```typescript
// Types.ts — add enum value + interface
export enum ObjType { Log = 0, Ball = 1 }
export interface IFallingObj { objId: number; getLowestY(): number; }

// Assets.ts — add template entry
export const ObjTemplates: Record<ObjType, TemplateAsset> = {
  [ObjType.Log]:  new TemplateAsset('../Templates/GameplayObjects/Log.hstf'),
  [ObjType.Ball]: new TemplateAsset('../Templates/GameplayObjects/Ball.hstf'),
};

// BallObj.ts — self-contained, implements IFallingObj
@component()
export class BallObj extends Component implements IFallingObj { ... }
```

---

#### B — Auto-Registration (preferred when enum maintenance becomes a burden)

Each type registers itself at module load. **Zero changes to any existing file** when adding or removing a type.

```typescript
// ObjectRegistry.ts — service that accepts self-registration
@service()
export class ObjectRegistry extends Service {
  private static _pending: ObjDef[] = [];
  private _defs = new Map<string, ObjDef>();

  static register(def: ObjDef): void {
    ObjectRegistry._pending.push(def);  // called before service init
  }

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    for (const def of ObjectRegistry._pending) this._defs.set(def.id, def);
  }

  get(id: string): ObjDef | undefined { return this._defs.get(id); }
  all(): ObjDef[] { return [...this._defs.values()]; }
}

// DiamondObj.ts — entirely self-contained, no enum, no Assets.ts edit
ObjectRegistry.register({
  id: 'diamond',
  template: new TemplateAsset('../Templates/GameplayObjects/Diamond.hstf'),
  config: { gravity: 8, bounceX: 0.95 },
});
@component()
export class DiamondObj extends Component implements IFallingObj { ... }
```

**Use when:** content types are numerous or AI-generated; removing a feature must leave zero traces.

---

#### C — Pipeline / Chain of Responsibility (for multi-step processing)

When several independent rules apply in sequence (scoring, spawn selection, input filtering). Each rule is a separate file; adding/removing one never touches the others.

```typescript
// IScoringRule.ts
export interface IScoringRule {
  apply(ctx: ScoringContext): ScoringContext;
}

// ScoringService.ts — owns and runs the chain
@service()
export class ScoringService extends Service {
  private _rules: IScoringRule[] = [
    new PrecisionBonus(),
    new ComboMultiplier(),
  ];

  compute(ctx: ScoringContext): number {
    return this._rules.reduce((c, r) => r.apply(c), ctx).total;
  }
}

// ComboMultiplier.ts — standalone rule, zero deps on other rules
export class ComboMultiplier implements IScoringRule {
  apply(ctx: ScoringContext): ScoringContext {
    return { ...ctx, total: ctx.total * (1 + ctx.combo * 0.1) };
  }
}
```

**Use when:** multiple independent rules accumulate on the same value (scoring, difficulty scaling, spawn filtering).

---

#### D — Data-Driven Config (behavior variation without branching)

When types differ only in values, not logic. One generic component reads its profile; all variation lives in a config table.

```typescript
// In LevelConfig.ts or a dedicated ProfileConfig.ts
export const PHYSICS_PROFILES: Record<string, PhysicsProfile> = {
  log:     { gravity: 2.5, bounceX: 0.82, rotates: true  },
  ball:    { gravity: 5.0, bounceX: 0.88, rotates: false },
  feather: { gravity: 0.8, bounceX: 0.50, rotates: true  },
};

// Generic component — no type-specific branching
@subscribe(Events.InitFallingObj)
onInit(p: Events.InitFallingObjPayload): void {
  const profile = PHYSICS_PROFILES[p.objType];
  this._gravity = profile.gravity;
  this._bounceX = profile.bounceX;
}
```

**Use when:** objects share the same lifecycle and physics model but differ in tuning. Adding a variant = one line in the config table.

---

### Modularity Rules

- No direct component references (except for api component: transform, camera, customui etc...) — events only or reference entity
- One class per file; file name matches class name
- `Types.ts` and `Constants.ts` must not import from any sibling file
- All assets declared in `Assets.ts` by path (never via `@property()`)
- A manager/service orchestrates; a gameplay object handles its own behavior
- Prefer data in config tables over `if/switch` on type — new variant = new row, not new branch

---

## Key SDK APIs

### Component Skeleton

```typescript
import {
  Component, OnEntityStartEvent, NetworkingService,
  TransformComponent, EventService,
  component, property, subscribe,
  type Maybe,
} from 'meta/worlds';

@component()
export class MyComponent extends Component {
  // Inspector-tunable: must have a default value
  @property() private myValue: number = 1;
  // MHS must assign before run (error if not set in editor)
  @property() private requiredAsset!: TemplateAsset;
  // Nullable entity reference
  @property() private target: Maybe<Entity> = null;

  private _transform!: TransformComponent;  // set in onStart

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
  const dt = payload.deltaTime;  // seconds since last frame
}
```

`ExecuteOn.Owner` ensures the loop only runs on the owning client — no additional server guard needed.

### Transform

```typescript
const t = this.entity.getComponent(TransformComponent)!;
t.localPosition = new Vec3(x, y, z);     // local position
t.worldPosition = new Vec3(x, y, z);     // world position
t.localScale    = new Vec3(sx, sy, sz);
t.localRotation = Quaternion.fromEuler(new Vec3(rx, ry, rz));  // degrees
t.worldPosition   // read current world position
t.worldRotation   // read current world rotation
```

### Color

```typescript
import { ColorComponent, Color } from 'meta/worlds';
const c = this.entity.getComponent(ColorComponent)!;
c.color = new Color(r, g, b, a);  // r/g/b/a in [0, 1]; alpha optional (default 1)
```

### Template Assets (in Assets.ts)

```typescript
import { TemplateAsset } from 'meta/worlds';
import { MyObjType } from './Types';

export namespace Assets {
  // Pluggable map: add new types here only, core systems read this
  export const MyObjTemplates: Record<MyObjType, TemplateAsset> = {
    [MyObjType.Foo]: new TemplateAsset('../Templates/GameplayObjects/Foo.hstf'),
    [MyObjType.Bar]: new TemplateAsset('../Templates/GameplayObjects/Bar.hstf'),
  };
  export const FloatingText = new TemplateAsset('../Templates/GameplayObjects/FloatingText.hstf');
}
```

### Camera Setup (ClientSetup.ts)

```typescript
// ExecuteOn.Owner — runs on owning client only (= local player in solo)
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
      fov: cameraComponent?.fieldOfView ?? 60,
    });
  }, this.initDelay * 1000);
}

// Touch → local event
@subscribe(OnFocusedInteractionInputStartedEvent)
onTouchStarted(_p: OnFocusedInteractionInputEventPayload): void {
  EventService.sendLocally(Events.PlayerTap, {});
}
```

### HUD / UI (XAML + CustomUiComponent + UiViewModel)

```typescript
import { CustomUiComponent, UiViewModel, uiViewModel } from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

// 1. Define the ViewModel (fields auto-bind to XAML)
@uiViewModel()
export class MyHUDData extends UiViewModel {
  score: number = 0;
  centerText: string = '';
  showCenterText: boolean = false;
}

// 2. In the Component:
private _vm = new MyHUDData();
private _ui: Maybe<CustomUiComponent> = null;

@subscribe(OnEntityStartEvent)
onStart(): void {
  if (NetworkingService.get().isServerContext()) return;
  this._ui = this.entity.getComponent(CustomUiComponent);
  if (this._ui) this._ui.dataContext = this._vm;
}

// 3. Update a binding (triggers reactive UI update automatically)
this._vm.score = 42;

// 4. XAML binding syntax:
// <Label text="{score}" />
// <Panel visible="{showCenterText}"><Label text="{centerText}" /></Panel>
```

### Events Pattern (Types.ts)

Group events by concern into namespaces. All payload fields must have default values.

```typescript
import { LocalEvent, NetworkEvent, serializable } from 'meta/worlds';

// Local events (client-only, no @serializable needed)
export namespace Events {
  export class PhaseChangedPayload { readonly phase: GamePhase = GamePhase.Start; }
  export const PhaseChanged = new LocalEvent<PhaseChangedPayload>('EvPhaseChanged', PhaseChangedPayload);

  export class RestartPayload {}
  export const Restart = new LocalEvent<RestartPayload>('EvRestart', RestartPayload);
}

// HUD-specific events (keeps GameManager decoupled from UI)
export namespace HUDEvents {
  export class UpdateScorePayload { readonly score: number = 0; }
  export const UpdateScore = new LocalEvent<UpdateScorePayload>('EvHUDUpdateScore', UpdateScorePayload);
}

// Network events — payload MUST be @serializable, use sendGlobally
export namespace NetworkEvents {
  @serializable()
  export class UpdateScorePayload { readonly score: number = 0; }
  export const UpdateScore = new NetworkEvent<UpdateScorePayload>('EvNetUpdateScore', UpdateScorePayload);
}
// Usage: EventService.sendGlobally(NetworkEvents.UpdateScore, { score: 100 });
```

Rules:
- Event string IDs must be **globally unique** — always prefix with `Ev`
- `@serializable()` only for `NetworkEvent` payloads (not `LocalEvent`)
- `NetworkEvent` payloads: all fields `readonly`, class must have a no-arg constructor

---

## Coordinate System

Right-Handed Y-Up (RUB):

| Axis | Positive | Negative |
|------|----------|----------|
| X    | right    | left     |
| Y    | up       | down     |
| Z    | backward | forward  |

Play area (portrait mobile): **9 × 16 world units**, centered on origin.
Defined in `Constants.ts` as `BOUNDS`, `WIDTH`, `HEIGHT`.

---

## File Organization

```
Scripts/
  Types.ts           ← ALL interfaces, enums, events, payloads — no sibling imports
  Constants.ts       ← BOUNDS, play-area dims, tuning values — no sibling imports
  Assets.ts          ← ALL TemplateAsset refs (Record<EnumType, TemplateAsset> maps)
  ClientSetup.ts     ← Camera + touch input init (ExecuteOn.Owner)
  GameManager.ts     ← Phase, score, round progression, win/lose (Component)
  LevelConfig.ts     ← Per-round tuning: object types, counts, difficulty
  CollisionManager.ts← Generic AABB collision singleton (reuse as-is)
  UI/
    GameHUDViewModel.ts      ← Component + @uiViewModel() data class; HUDEvents
  [YourObject].ts   ← One component per file;
  Shared/            ← Cross-feature utilities (only when truly shared)

Templates/   ← .hstf templates for each spawnable type

Assistant/skills/    ← Reference docs for Claude
Docs/               ← Human-readable project docs
```

---

## Coding Standards

| Element | Convention | Example |
|---------|------------|---------|
| Class | PascalCase | `GameManager`, `BallObj` |
| Interface | `I` prefix | `IFallingObj`, `ICollider` |
| Enum | PascalCase, explicit values | `GamePhase { Start = 0 }` |
| Private field | `_` prefix | `_velocity`, `_health` |
| `@property()` field | camelCase, no prefix | `moveSpeed`, `initDelay` |
| Event string ID | `Ev` prefix | `'EvPlayerDied'`, `'EvRestart'` |
| Module constant | UPPER_SNAKE_CASE | `BOUNDS`, `FLOOR_Y` |

- All internal fields and methods: `private`
- Fields set in `onStart`: definite assignment `!` — `private _t!: TransformComponent`
- Unused parameters: prefix with `_` — `onReset(_p: Events.ResetPayload)`
- Never use `any` — use `unknown` with narrowing, or a typed interface
- Use `import type` for compile-time-only types
- `const` by default; `let` only when reassignment is needed
- Comments only for non-obvious logic

---

## Common Pitfalls

| Pitfall | Correct approach |
|---------|-----------------|
| Forgetting server guard in `onStart` | Every Component `onStart` must check `isServerContext()` |
| `Types.ts` importing from a sibling | `Types.ts` has zero local imports |
| `t.position.set(...)` on TransformComponent | Use `t.localPosition = new Vec3(...)` or `t.worldPosition = ...` |
| `customUi.dataModel` | The property is `customUi.dataContext = myViewModel` |
| `@serializable()` on a LocalEvent payload | Only `NetworkEvent` payloads need `@serializable()` |
| Spawning without `NetworkMode.LocalOnly` | All spawns must be `NetworkMode.LocalOnly` for solo |
| Calling `dispose()` on a `@service()` | Services persist — reset state manually |
| Holding a game piece component reference | Store only entity or api/core components (transform, camera, customUI etc..). For game pieces communicate only via events |
| Payload fields without default values | Every event payload field needs a default value |
| Magic numbers in gameplay code | Named constants in `Constants.ts`; per-instance via `@property()` |
| Active code on module load | Don't code feature or call advanced features directly from loading a module, wait for game cycle start or update or service started instead. Don't rely on module load order  |

---

## Debugging — Log Locations (Windows)

| Log | Path | Use for |
|-----|------|---------|
| Editor | `%USERPROFILE%\AppData\Local\Temp\horizon_editor` | Script errors |
| Asset Hub | `%USERPROFILE%\AppData\Local\Temp\asset_hub_app` | Asset import errors |
| World App | `%USERPROFILE%\AppData\Local\Temp\world_app` | Preview runtime errors |

Navigate to: latest date folder → largest session number subfolder → log files inside.
