---
name: new-hud
summary: Step-by-step guide for creating a new HUD/UI overlay component using the Horizon UI framework
include: on-demand
---

# Creating a New HUD Component

HUD components are `@component()` classes attached to a UI entity in the scene. They subscribe to gameplay events and update UI bindings (text, visibility, color, scale) in response.

Existing examples: `GameHUDViewModel`, `ComboHUDViewModel`, `HighScoreHUDViewModel`, `BackgroundAnimViewModel`.

---

## Architecture Pattern

```
Scene Entity ("MyHUD")
  ├── UIComponent (layout, bindings)
  └── MyHUDViewModel.ts (@component)
        ├── @subscribe(Events.X) → updates bound properties
        └── @subscribe(OnWorldUpdateEvent) → per-frame animation
```

HUD components follow the **ViewModel** pattern:
1. They expose `@property()` fields that the UI framework binds to
2. Gameplay events update those fields
3. The UI reactively reflects the changes

---

## Step 1 — Create the component

Create `Scripts/Components/MyHUDViewModel.ts`:

```typescript
import {
  component, Component, EventService, NetworkingService,
  OnEntityStartEvent, OnWorldUpdateEvent, OnWorldUpdateEventPayload,
  property, subscribe, TransformComponent, Vec3,
} from 'meta/worlds';
import { Events } from '../Types';

@component()
export class MyHUDViewModel extends Component {

  // ── Bound properties (UI reads these) ────────────────────────────
  @property()
  private label: string = '';

  @property()
  private isVisible: boolean = false;

  // ── Internal state ───────────────────────────────────────────────
  private _transform!: TransformComponent;
  private _isClient = false;

  // ── Lifecycle ────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    this._isClient = !NetworkingService.get().isServerContext();
    if (!this._isClient) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
  }

  // ── Event handlers ───────────────────────────────────────────────

  @subscribe(Events.SomeEvent)
  private onSomeEvent(p: Events.SomeEventPayload): void {
    if (!this._isClient) return;
    this.label = `Score: ${p.value}`;
    this.isVisible = true;
  }

  // ── Per-frame animation (optional) ───────────────────────────────

  @subscribe(OnWorldUpdateEvent)
  private onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._isClient) return;
    // Animate scale, position, opacity, etc.
  }
}
```

### Key patterns from existing HUDs

| Pattern | Example | Description |
|---|---|---|
| **Casino roll-up** | `GameHUDViewModel` | Score counts up gradually with scale punch + glow |
| **Pop-in / fade-out** | `ComboHUDViewModel` | Element scales up on trigger, fades after timeout |
| **Staggered slide-in** | `HighScoreHUDViewModel` | List items slide in one-by-one with delay |
| **DVD-bounce** | `GameHUDViewModel` | Center text bounces around the screen |
| **Color tiers** | `ComboHUDViewModel` | Color changes at combo thresholds (cyan→pink→magenta→gold) |

---

## Step 2 — Create the UI entity

In the Horizon editor:
1. Create a new entity (e.g. "MyHUD")
2. Add UI layout components (text, container, etc.)
3. Bind UI properties to the `@property()` fields of your component
4. Attach `MyHUDViewModel` as a component

---

## Step 3 — Define events if needed

If the HUD responds to events that don't exist yet, declare them in `Types.ts`:

```typescript
export namespace MyHUDEvents {
  export class ShowMyHUDPayload {
    readonly data: string = '';
  }
  export const ShowMyHUD = new LocalEvent<ShowMyHUDPayload>('EvMyHUDShow', ShowMyHUDPayload);

  export class HideMyHUDPayload {}
  export const HideMyHUD = new LocalEvent<HideMyHUDPayload>('EvMyHUDHide', HideMyHUDPayload);
}
```

Convention: HUD event namespaces follow the pattern `{Name}HUDEvents` (e.g. `ComboHUDEvents`, `HighScoreHUDEvents`).

---

## Step 4 — Add sound feedback

For HUD transitions that should have audio, the `AudioManager` already subscribes to common events. If your HUD needs custom sounds, add a subscriber in `AudioManager.ts`:

```typescript
@subscribe(MyHUDEvents.ShowMyHUD)
onShowMyHUD(_p: MyHUDEvents.ShowMyHUDPayload): void {
  this.playSound(SFX.MY_HUD_SHOW);
}
```

---

## Animation Tips

- Use `WorldService.get().getWorldTime()` for time-based animations (not cumulative dt)
- Scale animations: lerp toward target scale each frame, with overshoot for bounce (`targetScale * 1.15`)
- Fade: multiply alpha by decay factor (`alpha *= 0.92`) each frame, hide when below threshold
- Stagger: use `index * STAGGER_DELAY` as offset from animation start time

---

## Checklist

- [ ] Component file created at `Scripts/Components/MyHUDViewModel.ts`
- [ ] Server context guarded in `onStart` and event handlers
- [ ] `@property()` fields for all UI-bound values
- [ ] Event subscriptions for show/hide/update triggers
- [ ] UI entity created in editor with bindings
- [ ] Events declared in `Types.ts` (if new)
- [ ] Audio integration in `AudioManager.ts` (if sounds needed)
