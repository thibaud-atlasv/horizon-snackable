# H4_Idle — Claude Code Context

## Project

Mobile **portrait** single-player **idle/clicker** game built with **Meta Horizon Worlds SDK** (TypeScript).
Platform: Meta Horizon Studio · Language: TypeScript ES2022 · Target: mobile portrait, local single-player.

Skill files with deeper reference material: `Assistant/skills/`

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
EventService.sendLocally(Events.ResourceChanged, { type: ResourceType.Gold, amount: 100 });

// Target a specific entity
EventService.sendLocally(Events.InitGenerator, { defId: 0 }, { eventTarget: entity });

// Subscribe (works in both Component and Service)
@subscribe(Events.ResourceChanged)
private onResourceChanged(p: Events.ResourceChangedPayload): void { ... }
```

### Services — Preferred Singleton Pattern

```typescript
@service()
export class ResourceService extends Service {
  private _resources: Map<ResourceType, number> = new Map();

  @subscribe(OnServiceReadyEvent)
  onReady(): void { /* init */ }
}
```

### Content Extensibility Patterns

#### A — Registry + Interface (default for generators/upgrades)

```typescript
// Types.ts
export enum GeneratorType { Cursor = 0, Farm = 1, Mine = 2 }

// Assets.ts
export const GeneratorTemplates: Record<GeneratorType, TemplateAsset> = { ... };

// GeneratorDefs.ts — one entry per generator
export const GENERATOR_DEFS: IGeneratorDef[] = [
  { id: 0, type: GeneratorType.Cursor, name: 'Cursor', baseCost: 15, baseOutput: 0.1, ... },
];
```

#### B — Data-Driven Config (behavior variation without branching)

```typescript
export const UPGRADE_DEFS: IUpgradeDef[] = [
  { id: 0, name: 'Better Cursors', targetType: GeneratorType.Cursor, multiplier: 2, cost: 100 },
];
```

---

## Modularity Rules

- No direct component references (except api components: transform, camera, customui) — events only
- One class per file; file name matches class name
- `Types.ts` and `Constants.ts` must not import from any sibling file
- All assets declared in `Assets.ts`
- A manager/service orchestrates; a component handles its own visuals/behavior

---

## Key SDK APIs

### Component Skeleton

```typescript
@component()
export class MyComponent extends Component {
  @property() private myValue: number = 1;

  private _transform!: TransformComponent;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
  }
}
```

### Per-Frame Update

```typescript
@subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
onUpdate(payload: OnWorldUpdateEventPayload): void {
  const dt = payload.deltaTime;
}
```

### HUD / UI (XAML + CustomUiComponent + UiViewModel)

```typescript
@uiViewModel()
export class MyHUDData extends UiViewModel {
  gold: number = 0;
  goldPerSecond: string = '0/s';
  showPanel: boolean = true;
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

### Events Pattern (Types.ts)

```typescript
export namespace Events {
  export class ResourceChangedPayload { type: ResourceType = ResourceType.Gold; amount: number = 0; }
  export const ResourceChanged = new LocalEvent<ResourceChangedPayload>('EvResourceChanged', ResourceChangedPayload);
}
```

Rules:
- Event string IDs must be **globally unique** — always prefix with `Ev`
- No `@serializable()` on `LocalEvent` payloads
- All payload fields must have default values

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

```
Scripts/
  Types.ts           ← ALL interfaces, enums, events, payloads
  Constants.ts       ← Tuning values, play-area dims
  Assets.ts          ← ALL TemplateAsset refs
  Components/
    ClientSetup.ts     ← Camera + touch input init
    GameManager.ts     ← Game loop, phase, offline income tick
  Services/
    ResourceService.ts ← Resource amounts, income/sec computation
    GeneratorService.ts← Generator ownership + tick
    UpgradeService.ts  ← Purchased upgrades, multiplier computation
    SaveService.ts     ← Persistence via PlayerVariables
  Data/
    GeneratorDefs.ts   ← Static generator catalog
    UpgradeDefs.ts     ← Static upgrade catalog
  UI/
    MainHUDViewModel.ts   ← Resource display, click button
    ShopViewModel.ts      ← Generator + upgrade purchase UI

Templates/
  Generators/   ← .hstf per generator type
  UI/           ← HUD panels

Assistant/skills/
Docs/
```

---

## Coding Standards

| Element | Convention | Example |
|---------|------------|---------|
| Class | PascalCase | `ResourceService`, `GeneratorDef` |
| Interface | `I` prefix | `IGeneratorDef`, `IUpgradeDef` |
| Enum | PascalCase, explicit values | `ResourceType { Gold = 0 }` |
| Private field | `_` prefix | `_gold`, `_incomePerSec` |
| `@property()` field | camelCase, no prefix | `generatorId`, `initDelay` |
| Event string ID | `Ev` prefix | `'EvResourceChanged'`, `'EvUpgradePurchased'` |
| Module constant | UPPER_SNAKE_CASE | `BASE_CLICK_VALUE`, `TICK_INTERVAL` |

- `const` by default; `let` only when reassignment is needed
- Never use `any`
- Comments only for non-obvious logic

---

## Common Pitfalls

| Pitfall | Correct approach |
|---------|-----------------|
| Forgetting server guard in `onStart` | Every Component `onStart` must check `isServerContext()` |
| `Types.ts` importing from a sibling | `Types.ts` has zero local imports |
| Spawning without `NetworkMode.LocalOnly` | All spawns must be `NetworkMode.LocalOnly` |
| Calling `dispose()` on a `@service()` | Reset state in `@subscribe(Events.Restart)` |
| Magic numbers in gameplay code | Named constants in `Constants.ts` |
| Active code on module load | Wait for `OnServiceReadyEvent` or `OnEntityStartEvent` |
| Offline income computed on server | All logic client-side only |

---

## Debugging — Log Locations (Windows)

| Log | Path | Use for |
|-----|------|---------|
| Editor | `%USERPROFILE%\AppData\Local\Temp\horizon_editor` | Script errors |
| Asset Hub | `%USERPROFILE%\AppData\Local\Temp\asset_hub_app` | Asset import errors |
| World App | `%USERPROFILE%\AppData\Local\Temp\world_app` | Preview runtime errors |

Navigate to: latest date folder → largest session number subfolder → log files inside.
