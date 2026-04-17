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

The fundamental game element is a **shape+color pair** (e.g. "purple square", "red circle") — represented by a single sprite key like `squarePurple` or `circleGreen`. Shape alone or color alone is not sufficient to identify a pair — the player must match both dimensions simultaneously. This is what makes the distractors difficult: one wrong option shares the same shape but a different color, another shares the same color but a different shape.

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
- Shape visuals use pre-colored PNG sprite assets (one PNG per shape+color combination) — color tinting is baked into the sprite, displayed via XAML Image/Rectangle with OpacityMask
- UI cards (canvas panel, answer buttons, HUD) use XAML rounded-rectangle containers with drop shadows
- Total file size within 35MB limit

## UI Architecture

The display system uses Custom UI components with XAML data binding (UiViewModel → XAML):

- **ShapeIntruderDisplayViewModel** — Manages the game canvas and HUD. Contains a `shapes` array of `ShapeItemViewModel` (each holding `spriteTexture`, `x`, `y`, `scale`, `rotation`, `opacity`). Also holds 4 per-button properties (`option0–3SpriteTexture`, `option0–3BgColor`, `option0–3BorderColor`, check/cross visibility, offsetY for press animation). HUD: `scoreText`, `timerProgress`. Feedback: `overlayColor`, `overlayOpacity`, `feedbackValidVisible`, `feedbackInvalidVisible`, `feedbackIconScale`, `scorePopupText/Opacity/OffsetY/Visible`.
- **ShapeIntruderDisplayComponent** — Subscribes to game events; updates the ViewModel. Manages all animations via per-frame elapsed counters: overlay flash, blink, shape fade/pulse on wrong answer, feedback icon pop, score popup float, casino rolling score counter. On `RoundStarted`, logs all 4 option sprite keys and the correct answer key to the console for debugging.
- **shape_display.xaml** — 480×800 portrait layout:
  - **HUD banner** (top ~80px): score card with animated rolling number, floating `+XXX` popup, timer bar (ScaleTransform on X axis)
  - **Intruder Zone** (middle ~440px): soft-yellow rounded card; shapes rendered via ItemsControl + Canvas; each shape is an Image with TransformGroup (translate + rotate + scale)
  - **2×2 answer button grid** (bottom ~260px): 4 colored button cards, each with a centered shape Image, press-offset animation, checkmark/X badge overlays; tap fires `onAnswerOptionPressed` UiEvent
- **Visual feedback** — Correct: checkmark badge + confetti burst. Wrong/timeout: X badge on pressed button, checkmark on correct button, non-matching shapes dim, matching shapes pulse in scale.
- **App background**: sky blue `#7dd3fc`.

## Home Screen

A title screen is shown at launch and after each game over. It displays the game title ("Shape Intruder"), a subtitle explaining the goal, and a "Tap to start" button. Tapping starts a new game session; the home screen hides while the game is active and reappears on game over.

## Asset System

All sprite textures are declared in `Scripts/Assets.ts` as entries in `SHAPE_TEXTURE_MAP`. Each key is one shape+color combination (e.g. `heartBlue`, `squareRed`). `ShapeKey` and `SHAPE_KEYS` in `Scripts/Defs/ShapeDefs.ts` are derived automatically from that map — adding or removing a sprite entry there is the only change needed.

Sprites are pre-colored PNGs (not grayscale). Each `shape/` file encodes both the shape silhouette and its specific color baked in.

## Entity Setup

**space.hstf** — Scene template:
- **StartingWorld** (root) — `GameManager` component (instantiates all services)
- **SpawnPoint** — Player spawn location
- **Floor** — Ground plane
- **ShapePanel** — `CustomUiComponent` (ScreenSpace, `shape_display.xaml`) + `ShapeIntruderDisplayComponent`
- **Leaderboard** — `CustomUiComponent` (ScreenSpace, `LeaderboardHUD.xaml`, renderOrderOffset=1) + `LeaderboardHUDComponent`
- **HomeScreen** — `CustomUiComponent` (ScreenSpace, `home_screen.xaml`, renderOrderOffset=2, isInteractable=true) + `ShapeIntruderHomeScreenComponent`
- **ConfettiPanel** — `CustomUiComponent` (ScreenSpace, `ConfettiExplosion.xaml`, renderOrderOffset=3) + `ConfettiExplosionUIComponent`