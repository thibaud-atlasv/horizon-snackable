# Soccer Kick 3D — Project Summary

## Concept

Penalty shootout game. The player swipes to kick a ball toward a goal defended by an AI goalkeeper.
6 shots per round, score based on goals with combo and corner multipliers.
Snackable: simple, satisfying, short.

## Game Flow

`Start → Aim → Flying → Result → (next shot or GameOver) → tap to restart`

- **Start**: Title screen (UI — not yet implemented)
- **Aim**: Player swipes upward from the lower screen to shoot
- **Flying**: Ball travels toward goal, GK reacts after a delay
- **Result**: Outcome determined (Goal / Save / Post / Miss), ball bounces, then next shot
- **GameOver**: Stats overlay appears showing accuracy, goals, score, and star rating. Replay button or tap anywhere to restart.

## Round System

- Each round consists of **6 shots** (`TOTAL_SHOTS` in Constants.ts)
- After each shot, the outcome is resolved and the next shot starts automatically after a delay
- When all 6 shots are used, the game enters **GameOver** phase after a brief pause
- Tap anywhere during GameOver to start a fresh round (score, combo, shots all reset)

## Scoring System

### Base Points
- **Goal**: 100 points (`PTS_GOAL`)
- **Save / Post / Miss**: 0 points

### Corner Bonus
- A goal is a **corner goal** when `|ballX| > GOAL_HALF_W × 0.65` (i.e. ball enters near the posts)
- Corner goals get a **×1.8 multiplier** (`PTS_CORNER_MULTI`)
- Corner and combo multipliers stack: `points = 100 × cornerMulti × comboMulti`

### Combo System
- Consecutive goals increment the combo counter
- Any non-goal outcome (Save, Post, Miss) **resets combo to 0**
- When combo reaches **3** (`COMBO_THRESHOLD`), the combo multiplier activates
- Combo multiplier = combo count, **capped at ×6** (`MAX_COMBO_MULTI`)
- Progression: Goal → Goal → Goal (×3) → Goal (×4) → Goal (×5) → Goal (×6, max)

### Score Examples
| Shots sequence | Points per shot | Running total |
|---------------|-----------------|---------------|
| Goal | 100 × 1 = 100 | 100 |
| Goal | 100 × 1 = 100 | 200 |
| Goal (combo ×3) | 100 × 3 = 300 | 500 |
| Miss | 0 (combo reset) | 500 |
| Corner Goal | 100 × 1.8 = 180 | 680 |
| Goal | 100 × 1 = 100 | 780 |

## Shot Outcomes

| Value | Enum | Description | Visual Feedback | Color |
|-------|------|-------------|-----------------|-------|
| 0 | `ShotOutcome.Goal` | Ball enters the net | GOAL! (extreme animation) | #FFD700 (gold) |
| 1 | `ShotOutcome.Save` | Goalkeeper blocks the ball | SAVED! | #FF4444 (red) |
| 2 | `ShotOutcome.PostHit` | Ball hits post or crossbar | POST! | #FFFFFF (white) |
| 3 | `ShotOutcome.Miss` | Ball goes wide, too short, or stops | MISS! | #FF6B35 (orange) |

### Timing Between Shots
| Outcome | Delay before next shot |
|---------|----------------------|
| Goal | 1500ms |
| Save | 1300ms |
| Post | 1300ms |
| Miss | 1000ms |

## Data Available for UI

### `GameStateService.snapshot()` — returns `IGameSnapshot`

| Field | Type | Description |
|-------|------|-------------|
| `score` | number | Total score |
| `shotsLeft` | number | Remaining shots (starts at 6) |
| `goals` | number | Total goals scored this round |
| `combo` | number | Current consecutive goals streak |
| `bestCombo` | number | Best combo achieved this round |
| `comboMulti` | number | Active multiplier (1 if combo < 3, else combo, max 6) |
| `accuracy` | number | goals / shotsUsed, range [0..1] |

### `ShotFeedbackResultEvent` payload

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | number | ShotOutcome value (0-3) |
| `pointsEarned` | number | Points awarded for this shot (0 if not a goal) |

### Derivable from snapshot
- **Stars rating**: accuracy ≥ 80% → 3 stars, ≥ 50% → 2 stars, else 1 star
- **Combo active**: `comboMulti > 1`
- **Shots used**: `TOTAL_SHOTS - shotsLeft`

## Architecture

### Services

| Service | Responsibility |
|---------|----------------|
| `GameStateService` | Score, shots remaining, combo tracking, phase transitions |
| `BallService` | Ball position, velocity, gravity, collision detection (goal/post) |
| `GoalkeeperService` | GK position, idle sway, reaction AI, dive logic, save collision check |

### Components

| Component | Attached to | Role |
|-----------|-------------|------|
| `ClientSetup` | Scene entity | Camera init, swipe input → kick, tap-to-restart on GameOver |
| `GameManager` | Scene entity | Orchestrator: spawns entities, runs update loop, resolves shots |
| `BallController` | Ball template | Syncs transform from BallService, visual spin |
| `GoalkeeperController` | Goalkeeper template | Syncs transform from GoalkeeperService |
| `ShotFeedbackDisplayComponent` | Scene entity (Game) | Subscribes to shot outcome events, drives animated center-screen feedback UI |
| `SoccerKickHudComponent` | Scene entity (SoccerKickHud) | Polls GameStateService each frame, drives persistent HUD showing score, shot dots, and combo multiplier |
| `GameOverStatsComponent` | Scene entity (GameOverStats) | Full-screen game over overlay with animated stats (score, goals, accuracy, star rating) and replay button |

### Events

| Event | Payload | Fired by | Description |
|-------|---------|----------|-------------|
| `ShotFeedbackResultEvent` | `{ outcome, pointsEarned }` | GameManager | After each shot is resolved |

### Templates needed in MHS

| Template | Path | Notes |
|----------|------|-------|
| Ball | `@Templates/Ball.hstf` | Sphere, scale 0.56, attach BallController |
| Goalkeeper | `@Templates/Goalkeeper.hstf` | Voxel-style character, attach GoalkeeperController |
| Goal + Field | Scene (`space.hstf`) | Static geometry — posts, crossbar, net, grass, stripes |

### Scene setup (space.hstf)

- Attach `ClientSetup` to a scene entity, link `cameraAnchor` to a camera entity at position (0, 3, 13) looking at (0, 1.2, 0), FOV 58
- Attach `GameManager` to another scene entity
- Goal structure at origin: width 5.5, height 2.4, depth 1.4
- Penalty area with green grass surface, penalty spot at (0, 0, 9)
- Field dimensions: 14 units wide (±7 from center), depth Z=0 to Z=13

## Assets

### 3D Models

- **SoccerBall**: Realistic modern soccer ball with classic black pentagon and white hexagon pattern, suitable for gameplay (Models/SoccerBall/)
- **SoccerGoal**: Voxel-style soccer goal with 4 clearly visible blocky posts, stepped crossbar, and geometric net. White cubic aesthetic with retro blocky design. Dimensions: 5.5m wide × 2.4m tall × 2m deep (Models/SoccerGoal/)

## UI Components

### Shot Feedback Display
- **XAML**: `ui/ShotFeedbackPanel.xaml` — ScreenSpace UI for displaying shot outcomes
- **Attached to**: Game entity in space.hstf
- **Features**: Large centered feedback text with dynamic color, scale/translate transforms for animations, points display for goals
- **ViewModel bindings**: FeedbackText, TextColor, Opacity, ScaleX, ScaleY, TranslateX, TranslateY, IsVisible, PointsText, PointsOpacity
- **Animation**: Data-driven profiles (IAnimProfile). GOAL uses an extreme variant (×3 overshoot, double bounce, pulse, heavy shake). Other outcomes use a standard juicy animation.

### Soccer Kick HUD
- **XAML**: `ui/SoccerKickHud.xaml` — ScreenSpace UI for in-game HUD
- **Attached to**: SoccerKickHud entity in space.hstf
- **Layout**: Full-width Grid with three-column top row and centered instruction area
  - **Top-left**: Score cartouche badge (semi-transparent dark rounded badge with "SCORE" label and large score number)
  - **Top-center**: 6 shot indicator dots (scaled ×3: 60px ellipses with 6px stroke)
  - **Top-right**: Combo multiplier text (scaled ×3: 144px gold text with dark outline)
  - **Center**: Instruction text (72px white text with dark outline, visibility-bound)
- **ViewModel bindings**: ScoreText, Shot1Active through Shot6Active, ComboText, ComboVisible, InstructionText, InstructionVisible
- **Style**: Sporty 3D realistic style, vivid dynamic colors (greens, whites, golds), transparent background, Roboto font

### Power Gauge
- **XAML**: `ui/PowerGauge.xaml` — ScreenSpace UI for a vertical power bar
- **Attached to**: PowerGauge entity in space.hstf
- **Layout**: Bottom-left positioned vertical bar with conical background shape
  - Tapered/conical shape: narrower at bottom (~40px), wider at top (~120px), 500px tall
  - Background: Dark semi-transparent conical Path (#CC111111) with subtle white stroke (#66FFFFFF, 2px)
  - Gradient reveal: full-size gradient is clipped from bottom up (not resized), preserving color consistency
  - Vertical gradient: green (#4CAF50) at bottom → yellow (#FFEB3B) in middle → red (#F44336) at top
  - Height bound to `FillHeight` (0-500px), visibility bound to `GaugeVisible` (boolean)
- **ViewModel bindings**: FillHeight (number), GaugeVisible (boolean)
- **Public API** (from `PowerGaugeComponent`):
  - `setFillLevel(level: number)` — 0 to 1
  - `setVisible(visible: boolean)` — show/hide
- **Integration**: Other scripts get a reference via `entity.getComponent(PowerGaugeComponent)` and call the public methods

## Juice / Feedback Systems

### CameraShakeService (`Scripts/Services/CameraShakeService.ts`)
- `init(cameraEntity)` called from `ClientSetup` after camera setup
- Subscribes to `ShotFeedbackResultEvent` and triggers a decaying random-offset shake:
  - Goal → 0.25 intensity / 0.5s
  - Save → 0.12 / 0.3s
  - PostHit → 0.10 / 0.25s
  - Miss → 0.05 / 0.15s

### VfxService (`Scripts/Services/VfxService.ts`)
- `prewarm()` called from `GameManager._spawnEntities()` — spawns `VFX_POOL_SIZE` (60) Particle entities off-screen
- Subscribes to `ShotFeedbackResultEvent` and bursts particles at the relevant world position:
  - Goal → 20 golden confetti at ball position inside the net
  - Save → 10 white/blue particles at goal mouth centre
  - PostHit → 8 white sparks at ball position (near post)
  - Miss → 6 brown/green dust puffs at ground level
- Requires `@Templates/Particle.hstf` in MHS (small sphere, ColorComponent on root and children)

### Game Over Stats Overlay
- **XAML**: `ui/GameOverStats.xaml` — Full-screen overlay for end-of-round stats display
- **Layout**: Semi-transparent dark overlay (#CC000000) with centered card (~800px wide)
  - **Card**: Rounded corners (30px), dark green gradient background (#1B5E20 to #004D40)
  - **Title**: "GAME OVER" with white text and dark outline
  - **Stats section**: Three rows showing ACCURACY, GOALS, and SCORE (labels in gray, values in white)
  - **Star rating**: 3 stars (★ Unicode) with individual visibility, color, and scale bindings for pop-in animation
  - **Replay button**: Large green rounded button (#4CAF50, 400×80px) with scale/opacity animation bindings
- **ViewModel bindings**: OverlayVisible, CardScaleX/Y, CardOpacity, ScoreText, GoalsText, AccuracyText, Star1/2/3Visible, Star1/2/3Color, Star1/2/3Scale, ReplayButtonOpacity, ReplayButtonScale
- **Event binding**: `events.onReplayClickEvent` for replay button Command
- **Animation**: All animations driven from TypeScript via ViewModel property updates (no XAML storyboards)

## Not yet implemented

- Start screen
- Combo flash overlay (visual celebration on combo ×3+)
- Audio
