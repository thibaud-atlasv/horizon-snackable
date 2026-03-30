---
name: coding-standards
summary: H3_Fishing TypeScript conventions and patterns to follow strictly
include: always
---

# Coding Standards — H3_Fishing

## Naming

| Element | Convention | Example |
|---------|------------|---------|
| Class | PascalCase | `GameManager`, `SimpleFishController` |
| Interface | `I` prefix | `IFishInstance`, `IFishDef` |
| Enum | PascalCase, explicit values | `GamePhase { Idle = 0 }` |
| Private field | `_` prefix | `_velocity`, `_phase` |
| `@property()` | camelCase, no prefix | `fishAnchor`, `initDelay` |
| Event string ID | `Ev` prefix, globally unique | `'EvFishHooked'`, `'EvHUDShowCatch'` |
| Module constant | UPPER_SNAKE_CASE | `ZONE_FLOOR_Y`, `REEL_BURST_MAX` |
| Unused param | `_` prefix | `onReset(_p: Events.ResetPayload)` |

## File rules

- One class per file; file name matches class name exactly
- `Types.ts` and `Constants.ts` have **zero** local imports
- All `TemplateAsset` refs declared in `Assets.ts` — never via `@property()`
- Assets grouped by category (`Fish/`, `UI/`, scene elements)

## Component skeleton

```typescript
@component()
export class MyComponent extends Component {
  @property() myValue: number = 1;           // inspector-tunable, always has default
  @property() requiredAsset!: TemplateAsset; // must be set in editor

  private _transform!: TransformComponent;   // set in onStart, `!` = definite assignment

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return; // ALWAYS first line
    this._transform = this.entity.getComponent(TransformComponent)!;
  }
}
```

## Service skeleton

```typescript
@service()
export class MyService extends Service {
  private readonly _other = Service.inject(OtherService); // strong dep
  private _state = new Map<number, string>();

  @subscribe(OnServiceReadyEvent)
  onReady(): void { /* send events, access injected services */ }

  @subscribe(Events.Restart)
  onRestart(): void { this._state.clear(); } // reset, never dispose()
}
```

## Events

- All payloads: every field needs a **default value**
- `LocalEvent` for client-only; `NetworkEvent` + `@serializable()` for server↔client
- Never hold game-piece component references — communicate via events or entity refs only

## Spawning

All runtime spawns must use `NetworkMode.LocalOnly`:

```typescript
const entity = await WorldService.get().spawnTemplate({
  templateAsset: myTemplate,
  position: new Vec3(x, y, z),
  rotation: Quaternion.identity,
  scale: Vec3.one,
  networkMode: NetworkMode.LocalOnly,
});
```

## Transform mutations

```typescript
// ✅ correct
t.localPosition = new Vec3(x, y, z);
t.worldPosition = new Vec3(x, y, z);

// ❌ wrong — SDK ignores in-place mutation
t.localPosition.x = 5;
t.position.set(x, y, z);
```

## Per-frame update

```typescript
@subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
onUpdate(p: OnWorldUpdateEventPayload): void {
  const dt = p.deltaTime; // seconds
}
// ExecuteOn.Owner skips the isServerContext() guard
```

## Do not

- Use `any` — use `unknown` with narrowing or a typed interface
- Call `dispose()` on a `@service()` — reset state in `@subscribe(Events.Restart)`
- Import `Types.ts` or `Constants.ts` siblings from each other
- Run active code at module load — wait for `OnServiceReadyEvent` or `OnEntityStartEvent`
- Add comments for obvious code — only comment non-obvious logic
