---
name: coding-standards
summary: TypeScript guidelines — naming, types, modularity, HUD/ViewModel pattern, code style
include: always
---

# TypeScript Coding Standards

## Naming

| Element | Convention | Example |
|---|---|---|
| Class | PascalCase | `GameManager`, `FallingObj` |
| Interface | PascalCase + `I` prefix | `ICollider`, `IFallingObj` |
| Enum | PascalCase, explicit numeric values | `GamePhase { Start = 0, Falling = 2 }` |
| Private field | camelCase + `_` prefix | `_velocity`, `_phase` |
| `@property()` field | camelCase, no prefix | `moveSpeed`, `logW` |
| Event string ID | `Ev` prefix, globally unique | `'EvPlayerTap'`, `'EvFallingObjFrozen'` |
| Module constant | UPPER_SNAKE_CASE | `BOUNDS`, `FLOOR_Y`, `RESUME_DELAY_MS` |

---

## Types.ts — All Shared Definitions

Everything below belongs in `Types.ts`. Never scatter definitions across component files.

- Interfaces (`IFallingObj`, `Rect`)
- Enums (`GamePhase`, `ScoreGrade`, `FallingObjType`)
- All event namespaces

Current namespaces:

```typescript
export namespace Events        { … }  // Core gameplay local events
export namespace NetworkEvents { … }  // Network events (score sync with leaderboard server)
export namespace LeaderboardEvents { … }  // Show/hide leaderboard
export namespace HUDEvents     { … }  // HUD updates (score, message, grade, round)
```

Payload rules:
- **All payload fields must have default values**
- Use `@serializable()` on `NetworkEvent` payloads and on payloads containing `Vec3`/`Color`
- Enums must have explicit numeric values starting at 0

```typescript
export namespace Events {
  export class FallingObjFrozenPayload {
    readonly objId:   number     = 0;
    readonly pts:     number     = 0;
    readonly grade:   ScoreGrade = ScoreGrade.Miss;
    readonly lowestY: number     = 0;
  }
  export const FallingObjFrozen = new LocalEvent<FallingObjFrozenPayload>(
    'EvFallingObjFrozen', FallingObjFrozenPayload
  );
}
```

---

## HUD / ViewModel Pattern (XAML)

UI is built with `CustomUiComponent` + XAML. A ViewModel class exposes reactive properties; changes trigger automatic UI updates.

```typescript
import { UiViewModel, UiEvent, uiViewModel, CustomUiComponent } from 'meta/worlds';

// 1. Declare the ViewModel data class
@uiViewModel()
export class MyHUDViewModelData extends UiViewModel {
  score: number = 0;
  showPanel: boolean = false;
  title: string = '';

  // XAML button events (optional)
  readonly events = {
    onRestartClicked,
  };
}

const onRestartClicked = new UiEvent('MyHUD-onRestartClicked');

// 2. Create the Component that owns the ViewModel
@component()
export class MyHUDViewModel extends Component {
  private _viewModel = new MyHUDViewModelData();

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    const ui = this.entity.getComponent(CustomUiComponent);
    if (ui) ui.dataContext = this._viewModel;
  }

  // Update a field — triggers reactive UI update
  private _setScore(value: number): void {
    this._viewModel.score = value;
  }

  // Subscribe to a XAML button event
  @subscribe(onRestartClicked)
  onRestartClicked(): void {
    if (NetworkingService.get().isServerContext()) return;
    this.sendLocalEvent(Events.Restart, {});
  }
}
```

XAML binding syntax:
```xml
<Label text="{score}" />
<Panel visibility="{showPanel}" />
<Button Command="{Binding events.onRestartClicked}" />
```

---

## Modularity Rules

1. **No direct component references.** Components communicate only via `EventService`.
2. `Types.ts` and `Constants.ts` have zero local imports.
3. A manager orchestrates; a gameplay object handles its own behavior — neither does the other's job.
4. New shared utilities go in `Shared/` only when genuinely needed by two or more features.

---

## Code Style

- All internal fields and methods: `private`
- Fields set in `onStart`: use definite assignment `!` — `private _transform!: TransformComponent`
- Unused parameters: prefix with `_` — `onReset(_p: Events.ResetPayload)`
- Never use `any`. Use `unknown` and narrow if the type is genuinely unknown
- Use `import type` for compile-time-only types
- `const` by default; `let` only when reassignment is needed
- Comments only for non-obvious logic — never restate what the code does

---

## Common Pitfalls

| Pitfall | Correct approach |
|---|---|
| Missing server guard in `onStart` | Every `onStart` must check `isServerContext()` first |
| Spawning without `NetworkMode.LocalOnly` | All spawns are local-only |
| Payload field without a default value | Every `LocalEvent` payload field needs a default |
| Hardcoded template path in a component | Register in `Assets.ts`, reference via `Assets.X` |
| `Types.ts` importing from a sibling | Zero local imports in `Types.ts` |
| Holding a reference to another component | Use events only |
| Forgetting `dispose()` on restart | Call `dispose()` on every singleton in `Events.Restart` handler |
