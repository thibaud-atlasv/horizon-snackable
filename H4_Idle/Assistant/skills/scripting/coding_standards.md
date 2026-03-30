---
name: coding-standards
summary: H4_Idle TypeScript conventions and patterns to follow strictly
include: always
---

# Coding Standards — H4_Idle

## Naming

| Element | Convention | Example |
|---------|------------|---------|
| Class | PascalCase | `ResourceService`, `ShopViewModel` |
| Interface | `I` prefix | `IGeneratorDef`, `IUpgradeDef` |
| Enum | PascalCase, explicit values | `ResourceType { Gold = 0 }` |
| Private field | `_` prefix | `_gold`, `_incomePerSec` |
| `@property()` | camelCase, no prefix | `generatorId`, `initDelay` |
| Event string ID | `Ev` prefix, globally unique | `'EvResourceChanged'`, `'EvTick'` |
| Module constant | UPPER_SNAKE_CASE | `BASE_CLICK_VALUE`, `TICK_INTERVAL` |
| Unused param | `_` prefix | `onTick(_p: Events.TickPayload)` |

## File rules

- One class per file; file name matches class name exactly
- `Types.ts` and `Constants.ts` have **zero** local imports
- All `TemplateAsset` refs declared in `Assets.ts`

## Component skeleton

```typescript
@component()
export class MyComponent extends Component {
  @property() myValue: number = 1;

  private _transform!: TransformComponent;

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
  private readonly _dep = Service.inject(OtherService);
  private _state = new Map<number, number>();

  @subscribe(OnServiceReadyEvent)
  onReady(): void { /* send events, access injected services */ }
}
```

## Events

- All payload fields need a **default value**
- `LocalEvent` for client-only (no `@serializable()`)
- `NetworkEvent` + `@serializable()` for server↔client only
- Never hold component references from other game objects — use events or entity refs

## Spawning

```typescript
const entity = await WorldService.get().spawnTemplate({
  templateAsset: myTemplate,
  position: new Vec3(x, y, z),
  rotation: Quaternion.identity,
  scale: Vec3.one,
  networkMode: NetworkMode.LocalOnly, // ALWAYS
});
```

## Transform mutations

```typescript
t.localPosition = new Vec3(x, y, z); // ✅
t.localPosition.x = 5;               // ❌ SDK ignores in-place mutation
```

## Do not

- Use `any`
- Call `dispose()` on a `@service()` — reset in `@subscribe(Events.Restart)`
- Import siblings from `Types.ts` or `Constants.ts`
- Run active code at module load — wait for service/entity start events
- Add comments for obvious logic
