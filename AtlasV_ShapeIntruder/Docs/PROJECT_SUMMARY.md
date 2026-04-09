# Shape Intruder — Project Summary

## Concept

Shape Intruder is a mobile-first visual pattern recognition game targeting teens aged 13–17. The player is shown a canvas filled with a chaotic arrangement of colored geometric shapes and must identify which specific shape+color combination is **absent** from the image. The core cognitive challenge is scanning a visually noisy scene and holding multiple shape+color pairs in working memory simultaneously.

## Core Game Loop

Each session is a streak of timed rounds that continues until the player makes one mistake. Rounds grow progressively harder as shape density increases. There is no fixed endpoint — the goal is to survive as long as possible and maximize a leaderboard score.

**One round:**
1. A canvas fills with randomly positioned, rotated, colored geometric shapes
2. Four multiple-choice options appear — each showing a shape drawn in a specific color
3. Exactly one option is the absent pair (not present in the image); the other three are guaranteed to exist in the canvas
4. The player taps their answer before the timer runs out
5. Correct → points awarded, next round begins immediately
6. Wrong or timeout → the chosen shape is highlighted in the canvas (all others dim, a pulsing halo reveals where it was), then game over

## Atomic Unit

The fundamental game element is a **shape+color pair** (e.g. "violet square", "red circle"). Shape alone or color alone is not sufficient to identify a pair — the player must match both dimensions simultaneously. This is what makes the distractors difficult: one wrong option shares the same shape but a different color, another shares the same color but a different shape.

## Scoring

Points per round are based on response speed — faster answers score higher, and later rounds are worth more. Formula: `BASE_POINTS × timePct × (1 + round × ROUND_SCORE_MULT)`. One mistake ends the session and triggers the leaderboard.

## Remixable Elements

The game is designed to be extended and themed by an AI assistant. The following elements are independently swappable without breaking the core loop:

- **Shape library** — the set of geometric shapes in play
- **Color palette** — the colors assigned to shapes
- **Shape density** — how many shapes appear in the canvas per round
- **Timer duration** — seconds allowed per round
- **Difficulty scaling** — how fast shape count increases across rounds
- **Visual theme** — background color, shape style, UI colors
- **Scoring parameters** — base points, streak threshold, multiplier values

## Technical Constraints

- Portrait format, single-tap input
- All visual content is procedurally generated — zero image assets required
- Total file size within 35MB limit

## UI Architecture

The display system uses a Custom UI component attached to the player entity with XAML data binding:

- **ShapeIntruderDisplayViewModel** — Contains an array of ShapeItemViewModels for the canvas shapes, plus four individual ShapeItemViewModels (option0–option3) for the answer buttons. Also exposes `scoreText` (string) and `timerProgress` (0–1 number) for the HUD banner. Exposes a UiEvent (`onAnswerOptionPressed`) for button presses.
- **ShapeIntruderDisplayComponent** — Attached to the player entity; receives shape descriptors from game logic and updates the ViewModel. Populates answer option ViewModels on each round start, forwards button presses as `Events.AnswerSubmitted`, updates the score from `AnswerResult` payloads, and drives the timer bar from `TimerTick` events. Resets score and timer on `GameStarted`.
- **shape_display.xaml** — Fullscreen 480×800 XAML layout using a three-row structure: a HUD banner at the top (score text + shrinking timer bar), an "Intruder Zone" in the middle, and a 2×2 answer button grid at the bottom. The timer bar uses a Rectangle with a ScaleTransform bound to `timerProgress` that shrinks from right to left. The Intruder Zone is a rounded-corner container with `#1e1e2e` background that holds all the shapes; shape positions are relative to this zone (448×488), not the full canvas. Each answer button displays a colored shape (Ellipse for circles, Path for others) and fires the UiEvent with a CommandParameter (0–3).
- Supports all 11 shape types: circle, semicircle, triangle, square, pentagon, hexagon, star4, star, teardrop, cross, arrow
- **Visual feedback** — On answer result, buttons flash green (correct) or red (wrong) with tinted backgrounds and colored borders. A green/red feedback overlay is scoped to the Intruder Zone only — it does not cover the full screen. On a wrong answer, shapes matching the incorrect choice pulse in scale while all other shapes fade out, drawing the player's attention to what they selected. All feedback resets automatically when the next round starts.

## Home Screen

A title screen is shown at launch and after each game over. It displays the game title ("Shape Intruder"), a subtitle explaining the goal, and a "Tap to start" button. Tapping starts a new game session; the home screen hides while the game is active and reappears on game over.

## Entity Setup

- **player.hstf** — Player template with CustomUiComponent (ScreenSpace, shape_display.xaml) and ShapeIntruderDisplayComponent
- **space.hstf** — Scene template containing:
  - **StartingWorld** (root) — GameManager component
  - **SpawnPoint** — Player spawn location
  - **Floor** — Ground plane
  - **ShapePanel** — CustomUiComponent (ScreenSpace, shape_display.xaml) with ShapeIntruderDisplayComponent
  - **Leaderboard** — CustomUiComponent (ScreenSpace, LeaderboardHUD.xaml, renderOrderOffset=1) with LeaderboardHUDComponent
  - **HomeScreen** — CustomUiComponent (ScreenSpace, home_screen.xaml, renderOrderOffset=2, isInteractable=true) with ShapeIntruderHomeScreenComponent