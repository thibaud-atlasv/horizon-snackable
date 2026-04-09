---
name: adding-action-buttons
summary: Instructions for integrating a ready-made Action Button HUD system for simple button triggers. Useful for quick integration of player abilities like sprint, world-level triggers, testing, etc.
include: as_needed
---

# Action Buttons

Reusable 4-button HUD in a diamond layout (Y top, X left, B right, A bottom). The `.skill` suffix means files are copied into your project and modified as needed.

| .skill File | Purpose |
|-------------|---------|
| `ActionButtons.ts.skill` | Core logic: types, events, state, registration API |
| `ActionButtonsHUD.ts.skill` | Standalone HUD component + ViewModel |
| `ActionButtonsHUD.xaml.skill` | Standalone XAML (for projects without existing HUD) |

## Key Rules

- **Events fire TWICE** — `down` on press, `up` on release. Always check `payload.state`.
- **No emoji in labels** — Custom UI won't render them. Plain text only, ≤6 chars.
- **HUD auto-refreshes** via callback when `registerAction()`/`unregisterAction()` is called — no manual refresh needed.
- **ScreenSpace UI** — `CustomUiComponent.customUiType` must be `ScreenSpace` with `isInteractable: true`.
- UI events use `"ActionButtons-"` prefix to avoid collisions.
- When providing a summary about action button implementation, ONLY refer to buttons by their given label, NOT their ID. The ID is a hidden internal detail and will be confusing to others.
  - GOOD: "Press the **Sprint** button"
  - BAD: "Press the **B** button".

---

## Setup Paths

> **SKIP SETUP IF ALREADY INSTALLED**: Check if `scripts/ActionButtons.ts` exists in the project. If it does, the action buttons system is already set up — skip directly to [Registering Actions](#registering-actions).

Pick one:

| Scenario | Path |
|----------|------|
| No existing HUD (blank project) | **Setup A** |
| Existing HUD — keep separate UI entity | **Setup B** (same as A; both HUDs coexist) |
| Existing HUD — merge buttons into it | **Setup C** |

### Setup A & B: Standalone HUD

**Step 1 — Copy files using `copy_local_file`**:

> **⚠️ IMPORTANT**: You **MUST** use `copy_local_file` to copy these files. Do NOT attempt to create files from scratch or use any other method. **Issue ALL `copy_local_file` calls in a single turn** (parallel execution).

| Source | Destination |
|--------|-------------|
| `Assistant/skills/scripting/action-buttons/ActionButtons.ts.skill` | `scripts/ActionButtons.ts` |
| `Assistant/skills/scripting/action-buttons/ActionButtonsHUD.ts.skill` | `scripts/ActionButtonsHUD.ts` |
| `Assistant/skills/scripting/action-buttons/ActionButtonsHUD.xaml.skill` | `UI/ActionButtonsHUD.xaml` |

**Step 2 — Wait for build**: `wait_for_asset_build` with `scripts/ActionButtons.ts`, `scripts/ActionButtonsHUD.ts`

**Step 3 — Create HUD entity in scene** (tool sequence):

1. `open_template` → `space.hstf`
2. `get_root_entity`
3. `create_entity` → parent: root, name: `ActionButtonsHUD`
4. `add_component_to_entity` → component: `CustomUi`
5. `bulk_get_asset_id` → `{ filePath: "UI/ActionButtonsHUD.xaml", targetType: "xaml" }`
6. `bulk_set_entity_component_properties` → component: `CustomUiPlatformComponent`:
   - `customUiType` = `ScreenSpace`
   - `isInteractable` = `true`
   - `xaml` = asset ID from step 5
7. `add_component_to_entity` → component: `ActionButtonsHUD`
8. `template_save`

Result entity structure:
```
ActionButtonsHUD (Entity)
├── CustomUiComponent (ScreenSpace, interactable, xaml ref)
└── ActionButtonsHUD (script)
```

For **Setup B**, this creates a second HUD entity alongside your existing one — both render simultaneously.

**Step 4** — [Register Actions](#registering-actions)

---
### Setup C: Merge into Existing HUD

**Step 1 — Copy core file using `copy_local_file`**:

> **⚠️ IMPORTANT**: You **MUST** use `copy_local_file` to copy this file. Do NOT attempt to create it from scratch or use any other method.

Use `copy_local_file` to copy `Assistant/skills/scripting/action-buttons/ActionButtons.ts.skill` → `scripts/ActionButtons.ts`. You do NOT need the HUD .ts or .xaml files.

**XAML**: Copy the `ActionButtonTemplate` ControlTemplate and the action buttons Grid from `Assistant/skills/scripting/action-buttons/ActionButtonsHUD.xaml.skill` into your existing XAML. Add `xmlns:b="http://schemas.microsoft.com/xaml/behaviors"` to root if missing.

**TypeScript**: Integrate the button handlers and ViewModel properties from `Assistant/skills/scripting/action-buttons/ActionButtonsHUD.ts.skill` into your existing HUD component and ViewModel. The pattern for each button (A/B/X/Y):

```typescript
// ViewModel properties per button (repeat for A, B, X, Y):
IsButton{Id}Visible: boolean = false;
Button{Id}Label: string = "{Id}";
IsButton{Id}Pressed: boolean = false;

// ViewModel events:
override readonly events = {
  onButton{Id}Down: BUTTON_EVENTS.{Id}.down,
  onButton{Id}Release: BUTTON_EVENTS.{Id}.release,
  // ... for each button
};

// HUD component handlers per button:
@subscribe(BUTTON_EVENTS.{Id}.down, { execution: ExecuteOn.Owner })
onButton{Id}Down(): void {
  this.viewModel.IsButton{Id}Pressed = true;
  handleButtonDown('{Id}');
}
@subscribe(BUTTON_EVENTS.{Id}.release, { execution: ExecuteOn.Owner })
onButton{Id}Release(): void {
  this.viewModel.IsButton{Id}Pressed = false;
  handleButtonRelease('{Id}');
}
```

In `onStart()`, call `getAllButtonConfigs()` to set initial visibility/labels, and register a callback:

```typescript
setConfigChangeCallback(() => {
  const configs = getAllButtonConfigs();
  // Update IsButton{Id}Visible and Button{Id}Label for each button
});
```

In `onDestroy()`: `setConfigChangeCallback(null);`

Then proceed to [Register Actions](#registering-actions).

---

## Registering Actions

Call `registerAction()` from **any** component — the HUD updates automatically.

### Example: Sprint Controller (on Player Template)

```typescript
import { LocalEvent, Component, component, subscribe, OnEntityStartEvent, ExecuteOn, PlayerComponent } from "meta/worlds";
import type { Maybe } from "meta/worlds";
import { registerAction, ActionButtonPayload } from './ActionButtons';

export const SprintActionEvent = new LocalEvent<ActionButtonPayload>('SprintActionEvent', ActionButtonPayload);

@component()
export class SprintController extends Component {
  private playerComponent: Maybe<PlayerComponent> = null;
  private baseSpeed: number = 15.0;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    this.playerComponent = this.entity.getComponent(PlayerComponent);
    if (this.playerComponent) this.baseSpeed = this.playerComponent.locomotionSpeed;
    registerAction('B', 'Sprint', SprintActionEvent);
  }

  @subscribe(SprintActionEvent, { execution: ExecuteOn.Everywhere })
  onSprintAction(payload: ActionButtonPayload): void {
    if (!this.playerComponent || !this.entity.isOwned()) return;
    if (payload.state === 'down') {
      this.baseSpeed = this.playerComponent.locomotionSpeed;
      this.playerComponent.locomotionSpeed = this.baseSpeed * 2.0;
    } else {
      this.playerComponent.locomotionSpeed = this.baseSpeed;
    }
  }
}
```

**Attach to player template:**
1. `wait_for_asset_build` → `scripts/SprintController.ts`
2. `open_or_create_player_template`
3. `get_root_entity`
4. `add_component_to_entity` → `SprintController`
5. `template_save`
6. `open_template` → `space.hstf` (return to scene)

---

## Subscribing to Actions

```typescript
// Hold action (sprint, charge): check both states
@subscribe(DashEvent, { execution: ExecuteOn.Everywhere })
onDash(payload: ActionButtonPayload) {
  if (payload.state === 'down') this.startDash();
  else this.endDash(); // payload.duration = seconds held
}

// Instant action (jump): act on 'down' only
@subscribe(JumpEvent, { execution: ExecuteOn.Everywhere })
onJump(payload: ActionButtonPayload) {
  if (payload.state === 'down') this.jump();
}

// Charge-up query (in update loop):
const state = getActionState(ChargeAttackEvent);
if (state.isDown) this.chargeLevel = Math.min(state.duration / 2.0, 1.0);
```

---

## Dynamic Registration

```typescript
registerAction('X', 'NewAbility', NewAbilityEvent);  // shows button
unregisterAction('X');                                 // hides button
```

---

## API Reference

**Registration:** `registerAction(buttonId, label, event)` · `unregisterAction(buttonId)` · `getButtonConfig(buttonId)` · `getAllButtonConfigs()` · `setConfigChangeCallback(cb)`

**State:** `getActionState(event)` → `{ isDown, duration }` · `isAnyButtonDown()` · `resetAllButtonStates()`

**HUD handlers:** `handleButtonDown(id)` · `handleButtonRelease(id)`

**Types:**
```typescript
type ButtonId = 'A' | 'B' | 'X' | 'Y';
class ActionButtonPayload { state: 'down' | 'up'; duration: number; } // duration=0 on down, hold time on up
interface ActionButtonState { isDown: boolean; duration: number; }
```

---

## Customization

In the XAML outer Grid: `HorizontalAlignment` (Left/Center/Right), `VerticalAlignment` (Top/Center/Bottom), `Margin="left,top,right,bottom"`. Button size: change `Width`/`Height` on each `<Button>`. Style: edit the `ActionButtonTemplate` ControlTemplate.

---

## Troubleshooting

**Buttons don't appear:**
- `CustomUiComponent`: `customUiType`=`ScreenSpace`, `isInteractable`=`true`, `xaml` refs correct asset
- `ActionButtonsHUD` script component is attached to entity
- XAML built successfully (`wait_for_asset_build`)
- `registerAction()` is actually being called

**Buttons visible but non-functional:**
- `isInteractable` must be `true`
- Subscriber uses same event instance passed to `registerAction()`
- Use `{ execution: ExecuteOn.Everywhere }` for action subscriptions
- Check `this.entity.isOwned()` before modifying player properties

**No press feedback:**
- ViewModel needs `IsButton{Id}Pressed` properties set in handlers
- XAML needs pressed overlay Ellipses bound to those properties (see full XAML file)
