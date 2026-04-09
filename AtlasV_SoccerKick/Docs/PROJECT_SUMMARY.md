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
- **GameOver**: Final score displayed. Tap anywhere to restart a new round.

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

## Not yet implemented

- Start screen / Game Over screen with stats
- Combo flash overlay (visual celebration on combo ×3+)
- Screen shake on goal
- Particles (confetti on goal, dust on miss)
- Audio
