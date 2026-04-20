---
name: architecture
summary: Shape Intruder service/component architecture, event flow, and extension points
include: always
---

# Shape Intruder — Architecture

## Overview

All gameplay runs client-side only. The server context is used exclusively for leaderboard operations (fetch/write via `LeaderboardsService`).

Three services drive the game loop. They communicate only through `LocalEvent` — no direct references between services.

```
GameStateService  ──→  RoundService  ──→  TimerService
      ↑                     │                   │
      └────────── Events ───┘───────────────────┘
```

---

## Services

| Service | Responsibility |
|---------|---------------|
| `GameStateService` | Score, round counter, answer validation, game-over trigger |
| `RoundService` | Generates shape layout and 4 options; fires `RoundStarted` |
| `TimerService` | Countdown per round; fires `TimerTick` (pct 1→0) and `TimerExpired` |

Services are instantiated in `GameManager.onStart()` via `.get()` and communicate only through `LocalEvent`.

---

## Components (client UI)

| Component | Entity | Role |
|-----------|--------|------|
| `ShapeIntruderDisplayComponent` | ShapePanel | Canvas shapes + 4 option buttons + HUD + animations |
| `ShapeIntruderHomeScreenComponent` | HomeScreen | Title screen show/hide |
| `LeaderboardHUDComponent` | Leaderboard | Game-over leaderboard (server fetches, client renders) |
| `ConfettiExplosionUIComponent` | ConfettiPanel | Confetti particle system on correct answer |

---

## Event flow (one round)

```
[UI]  GameStartRequested
  → GameStateService resets state
  → fires GameStarted
    → RoundService resets round counter
    → fires RoundStarted {shapes, options, correctIndex}
      → ShapeIntruderDisplayComponent populates canvas + buttons
    → TimerService starts countdown
      → fires TimerTick every frame (pct 1→0)
        → ShapeIntruderDisplayComponent updates timer bar
      → fires TimerExpired (if time runs out)
        → GameStateService treats as wrong answer

[UI]  AnswerSubmitted {optionIndex}
  → GameStateService validates, computes score
  → fires AnswerResult {correct, timeout, correctIndex, wrongIndex, pointsEarned, newScore}
    → ShapeIntruderDisplayComponent plays feedback animation
    → LeaderboardHUDComponent (if wrong: early score submit)
  → if correct: setTimeout(NEXT_ROUND_DELAY_MS) → NextRoundRequested → RoundService
  → if wrong:   setTimeout(GAME_OVER_DELAY_MS)  → GameOver → LeaderboardHUDComponent shows UI
```

---

## Extension points

### Add a new gameplay feature

- New mechanic (power-up, streak bonus, etc.) → add a new `Service` file; subscribe to existing events.
- New visual effect → add a new `Component` on a new entity; subscribe to the relevant event.
- Do not modify existing services/components unless strictly required.

### Add shapes or colors

See `scripting/adding-content.md`.

### Tune difficulty or scoring

See `scripting/tuning-rules.md`.

### Retheme the UI

Edit `UI/shape_display.xaml`, `UI/home_screen.xaml`, or `UI/LeaderboardHUD.xaml`. ViewModel properties are the interface — no TypeScript changes needed for purely visual changes.

---

## What NOT to do

- Do not add events or interfaces "just in case" — only add what is needed now
- Do not call `dispose()` on services — reset fields on `GameStarted` instead
- Do not spawn entities without `NetworkMode.LocalOnly`
- Do not add `@property()` for template/texture assets — declare all assets in `Assets.ts`
