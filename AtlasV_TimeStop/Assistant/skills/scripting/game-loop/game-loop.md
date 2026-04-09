---
name: game-loop
summary: Complete game state machine with screen management for MainMenu→Playing→Pause→GameOver flow. Use when implementing the primary game loop with menu screens. This should be used for just about any game with a start and end state.
include: as_needed
---

# Game Loop Skill

Reusable state machine and UI screens for the primary game flow:

```text
MainMenu ──(START)──→ Playing ←──(RESUME)──→ Pause
                         │
                    (ShowGameOverEvent)
                         ↓
                     GameOver ──(HOME)──→ MainMenu
```

## Skill Files

| File | Purpose |
|------|---------|
| `GameStateComponent.ts.skill` | Core state machine: enum, events, transitions, guards |
| `MainMenuScreen.ts.skill` | Main menu with START button, loading state |
| `GameOverScreen.ts.skill` | Game over/victory screen with ShowGameOverEvent |
| `PauseMenuScreen.ts.skill` | Pause overlay with RESUME button |
| `MainMenuScreen.xaml.skill` | Main menu UI layout |
| `GameOverScreen.xaml.skill` | Game over UI layout (victory/defeat + score) |
| `PauseMenuScreen.xaml.skill` | Pause menu UI layout |

---

## Key Rules

- **All events namespaced** with `GameLoop-` prefix to avoid collisions
- **Screens auto-show/hide** by subscribing to `OnGameStateChangedLocal`
- **GameOver guard**: Can ONLY transition to MainMenu (prevents invalid states)
- **Pause guard**: Won't show when coming from MainMenu (prevents flash on game start)
- **CustomUiComponent requirements**: `customUiType = ScreenSpace`, `isInteractable = true`

---

## Setup

> **SKIP SETUP IF ALREADY INSTALLED**: Check if `scripts/GameStateComponent.ts` exists in the project. If it does, the game loop system is already set up — skip directly to the usage sections below (Triggering Game Over, Triggering Pause, etc.).

### Step 1: Copy Script and XAML Files

> **⚠️ IMPORTANT**: You **MUST** use `copy_local_file` to copy these files. Do NOT attempt to create files from scratch or use any other method. **Issue ALL `copy_local_file` calls in a single turn** (parallel execution).

| Source | Destination |
|--------|-------------|
| `Assistant/skills/scripting/game-loop/GameStateComponent.ts.skill` | `scripts/GameStateComponent.ts` |
| `Assistant/skills/scripting/game-loop/MainMenuScreen.ts.skill` | `scripts/MainMenuScreen.ts` |
| `Assistant/skills/scripting/game-loop/GameOverScreen.ts.skill` | `scripts/GameOverScreen.ts` |
| `Assistant/skills/scripting/game-loop/PauseMenuScreen.ts.skill` | `scripts/PauseMenuScreen.ts` |
| `Assistant/skills/scripting/game-loop/MainMenuScreen.xaml.skill` | `UI/MainMenuScreen.xaml` |
| `Assistant/skills/scripting/game-loop/GameOverScreen.xaml.skill` | `UI/GameOverScreen.xaml` |
| `Assistant/skills/scripting/game-loop/PauseMenuScreen.xaml.skill` | `UI/PauseMenuScreen.xaml` |

### Step 2: Wait for Build

```text
wait_for_asset_build: scripts/GameStateComponent.ts, scripts/MainMenuScreen.ts, scripts/GameOverScreen.ts, scripts/PauseMenuScreen.ts
```

### Step 3: Create Scene Entities

Create the following entity hierarchy in your scene:

**GameState Entity (root):**

1. `create_entity` → name: `GameState`
2. `add_component_to_entity` → `GameStateComponent`

**GameLoopUI Entity (child of GameState):**

1. `create_entity` → name: `GameLoopUI`, parent: `GameState`

**MainMenuScreen Entity (child of GameLoopUI):**

1. `create_entity` → name: `MainMenuScreen`, parent: `GameLoopUI`
2. `add_component_to_entity` → `CustomUi`
3. `bulk_get_asset_id` → `{ filePath: "UI/MainMenuScreen.xaml", targetType: "xaml" }`
4. `bulk_set_entity_component_properties` → `CustomUiPlatformComponent`:
   - `customUiType` = `ScreenSpace`
   - `isInteractable` = `true`
   - `isBlocking` = `true`
   - `panelVisibility` = `true`
   - `renderOrderOffset` = `100`
   - `xaml` = asset ID from step 3
5. `add_component_to_entity` → `MainMenuScreen`

**GameOverScreen Entity (child of GameLoopUI):**

1. `create_entity` → name: `GameOverScreen`, parent: `GameLoopUI`
2. `add_component_to_entity` → `CustomUi`
3. `bulk_get_asset_id` → `{ filePath: "UI/GameOverScreen.xaml", targetType: "xaml" }`
4. `bulk_set_entity_component_properties` → `CustomUiPlatformComponent`:
   - `customUiType` = `ScreenSpace`
   - `isInteractable` = `true`
   - `isBlocking` = `true`
   - `panelVisibility` = `false`
   - `renderOrderOffset` = `100`
   - `xaml` = asset ID from step 3
5. `add_component_to_entity` → `GameOverScreen`

**PauseMenuScreen Entity (child of GameLoopUI):**

1. `create_entity` → name: `PauseMenuScreen`, parent: `GameLoopUI`
2. `add_component_to_entity` → `CustomUi`
3. `bulk_get_asset_id` → `{ filePath: "UI/PauseMenuScreen.xaml", targetType: "xaml" }`
4. `bulk_set_entity_component_properties` → `CustomUiPlatformComponent`:
   - `customUiType` = `ScreenSpace`
   - `isInteractable` = `true`
   - `isBlocking` = `true`
   - `panelVisibility` = `false`
   - `renderOrderOffset` = `100`
   - `xaml` = asset ID from step 3
5. `add_component_to_entity` → `PauseMenuScreen`

---

## Triggering Game Over (Victory or Defeat)

Use `ShowGameOverEvent` to trigger the game over screen with win/lose status and score:

```typescript
import { EventService } from "meta/worlds";
import { ShowGameOverEvent } from './GameOverScreen';

// Player wins:
EventService.sendLocally(ShowGameOverEvent, { won: true, finalScore: 1500 });

// Player loses/dies:
EventService.sendLocally(ShowGameOverEvent, { won: false, finalScore: 750 });
```

The screen will display:

- **"VICTORY!"** or **"GAME OVER"** based on `won` value
- **Final score** from `finalScore` value
- **HOME button** to return to main menu

---

## Triggering Pause

Toggle pause from input (e.g., ESC key or pause button):

```typescript
import { EventService } from "meta/worlds";
import { ChangeGameStateEvent, GameState, GameStateComponent } from './GameStateComponent';

// Toggle pause:
if (GameStateComponent.instance?.isInState(GameState.Playing)) {
  EventService.sendGlobally(ChangeGameStateEvent, { toState: GameState.Pause });
} else if (GameStateComponent.instance?.isInState(GameState.Pause)) {
  EventService.sendGlobally(ChangeGameStateEvent, { toState: GameState.Playing });
}
```

---

## Resetting Player State on Restart

When transitioning from MainMenu → Playing, reset player state:

```typescript
import { subscribe } from "meta/worlds";
import { OnGameStateChanged, GameStateChangedPayload } from './GameStateComponent';

@subscribe(OnGameStateChanged)
onGameStateChanged(event: GameStateChangedPayload) {
  if (event.isNewGameStart()) {
    // Reset player state here:
    this.resetHealth();
    this.resetScore();
    this.resetPosition();
  }
}
```

---

## API Reference

### GameState Enum

```typescript
enum GameState {
  MainMenu = 'mainMenu',
  Playing = 'playing',
  Pause = 'pause',
  GameOver = 'gameOver'
}
```

### Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `ShowGameOverEvent` | Local | Trigger game over with win/lose + score data |
| `ChangeGameStateEvent` | Network (global) | Request state transition |
| `OnGameStateChanged` | Network (global) | State changed (for game logic) |
| `OnGameStateChangedLocal` | Local | State changed (for UI updates) |

### ShowGameOverPayload

```typescript
@serializable()
class ShowGameOverPayload {
  readonly won: boolean = false;      // true = victory, false = defeat
  readonly finalScore: number = 0;    // score to display
}
```

### GameStateComponent Methods

```typescript
GameStateComponent.instance               // Singleton access
.getState(): GameState                    // Get current state
.isInState(state: GameState): boolean     // Check if in specific state
.isPaused(): boolean                      // True if not Playing
.setState(state: GameState): void         // Direct state change (prefer events)
```

---

## Customization

### Adding New States

1. Add to `GameState` enum in `GameStateComponent.ts`:

   ```typescript
   export enum GameState {
     MainMenu = 'mainMenu',
     Playing = 'playing',
     Pause = 'pause',
     GameOver = 'gameOver',
     LevelUp = 'levelUp',    // New state
     Shop = 'shop',          // New state
   }
   ```

2. Create new screen component following the pattern in existing screens

3. Add transition guards in `setState()` if needed

### Adding Buttons to Screens

1. Add event in screen .ts file:

   ```typescript
   const onMyButtonClicked = new UiEvent('GameLoop-ScreenName-onMyButtonClicked');
   ```

2. Add to ViewModel events:

   ```typescript
   override readonly events = {
     onStartButtonClicked,
     onMyButtonClicked,  // Add here
   };
   ```

3. Add handler:

   ```typescript
   @subscribe(onMyButtonClicked)
   onMyButtonClicked() {
     // Handle click
   }
   ```

4. Add button in XAML:

   ```xml
   <Button Command="{Binding events.onMyButtonClicked}">
     <TextBlock Text="MY BUTTON"/>
   </Button>
   ```

### Extending ShowGameOverPayload

To add more end-game data (coins, enemies defeated, etc.):

1. Add properties to `ShowGameOverPayload` in `GameOverScreen.ts`:

   ```typescript
   @serializable()
   export class ShowGameOverPayload {
     @property()
     readonly won: boolean = false;

     @property()
     readonly finalScore: number = 0;

     @property()
     readonly coinsEarned: number = 0;  // New property

     @property()
     readonly enemiesDefeated: number = 0;  // New property
   }
   ```

2. Add corresponding properties to `GameOverScreenViewModel`:

   ```typescript
   public coinsEarned: number = 0;
   public enemiesDefeated: number = 0;
   ```

3. Update `onShowGameOver()` handler to copy new values:

   ```typescript
   @subscribe(ShowGameOverEvent)
   onShowGameOver(payload: ShowGameOverPayload) {
     this.viewModel.won = payload.won;
     this.viewModel.finalScore = payload.finalScore;
     this.viewModel.coinsEarned = payload.coinsEarned;
     this.viewModel.enemiesDefeated = payload.enemiesDefeated;
     // ...
   }
   ```

4. Bind in XAML:

   ```xml
   <TextBlock Text="{Binding coinsEarned}"/>
   <TextBlock Text="{Binding enemiesDefeated}"/>
   ```

---

## Troubleshooting

**Screens don't appear:**

- Verify `CustomUiComponent.customUiType` = `ScreenSpace`
- Verify `CustomUiComponent.isInteractable` = `true`
- Verify `CustomUiComponent.xaml` references correct asset
- Check that screen script component is attached to same entity

**Buttons don't work:**

- Verify `isInteractable = true` on CustomUiComponent
- Verify event name in XAML matches ViewModel events object
- Check console for binding errors

**State doesn't change:**

- Check that `GameStateComponent` exists in scene
- Verify event is sent with `EventService.sendGlobally()`
- Check console for guard rejection messages

**Pause shows briefly on game start:**

- This is handled by `lastState` tracking in PauseMenuScreen
- Verify the guard logic: `this.lastState !== GameState.MainMenu`

**Game over screen shows wrong title:**

- Ensure you're using `ShowGameOverEvent` with correct `won` value
- Check that `gameOverTitle` is being set in `onShowGameOver()` handler
