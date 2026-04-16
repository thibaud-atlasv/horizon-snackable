# Soccer Kick 3D — Project Summary

## Concept

Penalty shootout game. The player swipes to kick a ball toward a goal defended by an AI goalkeeper.
6 shots per round, score based on goals with combo, corner, and chip multipliers.
Snackable: simple, satisfying, short.

## Game Flow

`Start → Aim → Flying → Result → (next shot or GameOver) → tap to restart`

- **Aim**: Player swipes upward from the lower screen to shoot. A power gauge shows swipe intensity.
- **Flying**: Ball travels toward goal with physics (gravity, spin). GK reacts after a per-keeper delay.
- **Result**: Outcome determined (Goal / Save / Post / Miss), feedback UI + VFX + camera shake + sound play, ball bounces, then next shot.
- **GameOver**: Stats overlay appears showing accuracy, goals, score, star rating, and best combo. Replay button or tap anywhere to restart.

## Round System

- Each round consists of **6 shots** (`TOTAL_SHOTS` in Constants.ts)
- After each shot, the outcome is resolved and the next shot starts automatically after a delay
- A new goalkeeper type is randomly selected each round
- When all 6 shots are used, the game enters **GameOver** phase after a brief pause
- Tap anywhere during GameOver (or the replay button) to start a fresh round

## Scoring System

### Base Points
- **Goal**: 100 points (`PTS_GOAL`)
- **Save / Post / Miss**: 0 points

### Corner Bonus
- A goal is a **corner goal** when `|ballX| > GOAL_HALF_W * 0.65`
- Corner goals get a **x1.8 multiplier** (`PTS_CORNER_MULTI`)

### Chip Bonus
- A goal is a **chip goal** when `ballY > GOAL_HEIGHT * 0.72` and `|ballX| <= corner threshold`
- Chip goals get a **x1.5 multiplier** (`PTS_CHIP_MULTI`)

### Combo System
- Consecutive goals increment the combo counter
- Any non-goal outcome **resets combo to 0**
- When combo reaches **3** (`COMBO_THRESHOLD`), the combo multiplier activates
- Combo multiplier = combo count, **capped at x6** (`MAX_COMBO_MULTI`)
- Corner/chip and combo multipliers stack: `points = 100 * bonusMulti * comboMulti`

### Score Examples
| Shots sequence | Points per shot | Running total |
|---------------|-----------------|---------------|
| Goal | 100 x 1 = 100 | 100 |
| Goal | 100 x 1 = 100 | 200 |
| Goal (combo x3) | 100 x 3 = 300 | 500 |
| Miss | 0 (combo reset) | 500 |
| Corner Goal | 100 x 1.8 = 180 | 680 |
| Goal | 100 x 1 = 100 | 780 |

## Shot Outcomes

| Value | Enum | Description | Visual Feedback | Color |
|-------|------|-------------|-----------------|-------|
| 0 | `ShotOutcome.Goal` | Ball enters the net | GOAL! (stadium sweep animation) | #FFD700 (gold) |
| 1 | `ShotOutcome.Save` | Goalkeeper blocks the ball | SAVED! (impact animation) | #FF4444 (red) |
| 2 | `ShotOutcome.PostHit` | Ball hits post or crossbar | POST! (vibration animation) | #FFFFFF (white) |
| 3 | `ShotOutcome.Miss` | Ball goes wide or stops | MISS! (dramatic drop) | #FF6B35 (orange) |

### Timing Between Shots
| Outcome | Delay before next shot |
|---------|----------------------|
| Goal | 1500ms |
| Save | 1300ms |
| Post | 1300ms |
| Miss | 1000ms |

## Goalkeeper Types

Three keeper archetypes are defined in `Defs/KeeperDefs.ts`. One is randomly selected per round.

| Keeper | Template | Style | Reaction | Dive Chance | Hitbox |
|--------|----------|-------|----------|-------------|--------|
| Keeper 1 | Goalkeeper1 | Aggressive diver | 120ms | 90% | Narrow (0.8m) |
| Keeper 2 | Goalkeeper2 | Big slow | 200ms | 75% | Wide (1.25m) |
| Keeper 3 | Goalkeeper3 | Quick stepper | 60ms | 65% | Small (0.75m), high jump |

Each keeper has tuned values for: reaction delay, dive chance, lateral/dive speed, hitbox dimensions, idle sway speed, and shadow scale.

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

### Derivable from snapshot
- **Stars rating**: accuracy >= 80% -> 3 stars, >= 50% -> 2 stars, else 1 star
- **Combo active**: `comboMulti > 1`
- **Shots used**: `TOTAL_SHOTS - shotsLeft`

## Architecture

### Services

| Service | Responsibility |
|---------|----------------|
| `GameStateService` | Score, shots remaining, combo tracking, phase transitions |
| `BallService` | Ball position, velocity, gravity, collision detection (goal/post/ground) |
| `GoalkeeperService` | GK position, idle sway, reaction AI, dive logic, save collision (AABB + OBB) |
| `CameraShakeService` | Decaying random-offset camera shake on shot outcomes |
| `VfxService` | 60-entity particle pool, burst effects per outcome type |
| `BallTrailService` | 24-entity trail dot pool, emitted during flight |
| `AudioManager` | Event-driven sound routing via SoundComponent pool |

### Components

| Component | Attached to | Role |
|-----------|-------------|------|
| `ClientSetup` | Scene entity | Camera init, swipe input -> kick, tap-to-restart on GameOver |
| `GameManager` | Scene entity | Orchestrator: spawns entities, runs update loop, resolves shots |
| `BallController` | Ball template | Syncs transform from BallService, idle bounce animation, visual spin, shadow |
| `GoalkeeperController` | Keeper template | Syncs transform from GoalkeeperService, shadow management |
| `ShotFeedbackDisplayComponent` | Game entity | Center-screen animated feedback UI with casino roll-up counter |
| `SoccerKickHudComponent` | SoccerKickHud entity | Persistent HUD: score cartouche, 6 shot dots, instruction text |
| `PowerGaugeComponent` | PowerGauge entity | Vertical power bar (green->red gradient), visible during Aim phase |
| `GameOverStatsComponent` | GameOverStats entity | End-screen overlay: score, goals, accuracy, stars, best combo, replay button |
| `ConfettiExplosionUIComponent` | ConfettiExplosion entity | Full-screen confetti burst on goals |
| `AudioSource` | Sound entities | Registers SoundComponent with AudioManager by soundId |

### Events

| Event | Payload | Fired by |
|-------|---------|----------|
| `ShotFeedbackResultEvent` | outcome, pointsEarned, bonusZone | GameManager |
| `ScoreChangedEvent` | score, combo, comboMulti | GameStateService |
| `PhaseChangedEvent` | phase | GameStateService |
| `ShotFiredEvent` | shotsLeft | GameStateService |
| `GameResetEvent` | shotsLeft | GameStateService |
| `PointsReadyEvent` | score, comboMulti | ShotFeedbackDisplay |
| `AimStartedEvent` | (empty) | ClientSetup |
| `AimUpdatedEvent` | power | ClientSetup |
| `KeeperDespawnEvent` | (empty) | GameManager |
| `ConfettiExplosionTriggerEvent` | count | ShotFeedbackDisplay |

### Templates

| Template | Path | Notes |
|----------|------|-------|
| Ball | `@Templates/Ball.hstf` | Sphere, scale 0.56 |
| Keeper 1 | `@Templates/Keepers/Goalkeeper1.hstf` | Aggressive diver |
| Keeper 2 | `@Templates/Keepers/Goalkeeper2.hstf` | Big slow |
| Keeper 3 | `@Templates/Keepers/Goalkeeper3.hstf` | Quick stepper |
| Particle | `@Templates/Cube.hstf` | VFX burst particles |
| Trail dot | `@Templates/Sphere.hstf` | Ball trail dots |

## UI Components

### Shot Feedback Display (`ShotFeedbackPanel.xaml`)
- Center-screen animated text with outcome-specific animation profiles
- Casino counter: points roll-up (+0 -> +N) then drain (floats up to HUD)
- Combo display: red "COMBO xN" text with bonus zone tags (CORNER, CHIP)
- Profiles: GOAL (stadium sweep, x3.8 overshoot), SAVED (aggressive impact), POST (metal vibration), MISS (dramatic drop)

### Soccer Kick HUD (`SoccerKickHud.xaml`)
- Top-left: Score cartouche badge with elastic bounce on score arrival
- Top-center: 6 shot indicator dots with explosion/pop-in animations
- Center: "Swipe to shoot" instruction text with sine-wave bob

### Power Gauge (`PowerGauge.xaml`)
- Bottom-left vertical bar, visible only during Aim phase
- Tapered conical shape with green->yellow->red gradient
- API: `setFillLevel(0..1)`, `setVisible(bool)`

### Game Over Stats (`GameOverStats.xaml`)
- Full-screen dark overlay with animated entrance
- "END OF MATCH" title, large golden score, 3 stat cartouches (Goals, Precision, Best Combo)
- Star rating: 3 stars (80%+), 2 stars (50%+), 1 star (<50%)
- Golden "PLAY AGAIN" button with pulse animation

### Confetti Explosion (`ConfettiExplosion.xaml`)
- Full-screen dynamic confetti (8-color palette, 50 pieces on Goal)
- Random rotation, sinusoidal drift, gravity fall, fade-out

## Juice / Feedback Systems

| System | Trigger | Description |
|--------|---------|-------------|
| Camera Shake | ShotFeedbackResultEvent | Decaying random offset, intensity varies by outcome |
| VFX Particles | ShotFeedbackResultEvent | 60-piece pool, outcome-specific burst (confetti/sparks/dust) |
| Ball Trail | Ball in flight | 24-piece trail dot pool, soft white, fades over 0.35s |
| Ball Idle Bounce | Ball idle | Looping 3-bounce sequence with squash/stretch and shadow |
| UI Confetti | Goal scored | Full-screen XAML confetti explosion overlay |
| Sound Effects | Multiple events | Kick, outcomes, combos, game state transitions |

## Audio System

Event-driven sound routing via `AudioManager` service. Scene entities have `SoundComponent` + `AudioSource` component with a `soundId` matching an SFX constant.

### Sound IDs
| ID | Trigger |
|----|---------|
| `Kick` | Ball kicked (Flying phase) |
| `BallWhoosh` | Ball in flight |
| `BallHit` | Post/crossbar hit, save block |
| `sfx_goal` | Goal scored |
| `sfx_win` | Goal scored (layered) |
| `sfx_lose` | Save/post/miss |
| `GoalSave` | Goalkeeper save |
| `Miss` | Ball misses the frame |
| `Combo2/3/5` | Combo streak milestones |
| `sfx_game_start` | New round begins |
| `sfx_game_over` | GameOver phase reached |

## Assets

### 3D Models
- **SoccerBall**: Realistic modern soccer ball with classic black pentagon / white hexagon pattern
- **SoccerGoal**: Voxel-style soccer goal with blocky posts, crossbar, and geometric net
- **Goalkeeper1/2/3**: Three distinct goalkeeper character models with different proportions

## Scene Setup (space.hstf)

- Camera anchor at (0, 3, 13) looking at (0, 1.2, 0), FOV 58
- Goal structure at origin: width 6.2m, height 2.4m, depth 1.4m
- Penalty area with green grass, penalty spot at (0, 0, 9)
- UI entities: Game, SoccerKickHud, PowerGauge, GameOverStats, ConfettiExplosion
