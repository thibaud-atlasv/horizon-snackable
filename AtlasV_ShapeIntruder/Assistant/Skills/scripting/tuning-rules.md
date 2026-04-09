---
name: tuning-rules
summary: How to tune Shape Intruder game rules, difficulty, and scoring via Constants.ts
include: always
---

# Tuning Game Rules

All tunable parameters live in `Scripts/Constants.ts`. Change values there — no logic changes required.

## Difficulty

| Constant          | Default | Effect |
|-------------------|---------|--------|
| `SHAPE_COUNT_BASE`| 15      | Number of shapes on round 1 |
| `SHAPE_COUNT_MAX` | 50      | Hard cap on shapes (any round) |
| `DIFFICULTY_SCALE`| 0.08    | Shape count growth per round: `base × (1 + round × scale)` |
| `ROUND_TIME_SEC`  | 15      | Seconds allowed on round 1 |
| `ROUND_TIME_MIN`  | 3       | Minimum time (floor), reached late-game |
| `ROUND_TIME_DECAY`| 0.4     | Seconds lost per round: `time = max(MIN, SEC - round × DECAY)` |

**Easier:** lower `DIFFICULTY_SCALE`, raise `ROUND_TIME_SEC`, raise `ROUND_TIME_MIN`.  
**Harder:** raise `DIFFICULTY_SCALE`, lower `ROUND_TIME_SEC`, lower `ROUND_TIME_MIN`.

## Scoring

| Constant          | Default | Effect |
|-------------------|---------|--------|
| `BASE_POINTS`     | 1000    | Max points for an instant correct answer |
| `ROUND_SCORE_MULT`| 0.05    | Round bonus: `BASE × timePct × (1 + round × MULT)` |

Formula: `score += BASE_POINTS × timePct × (1 + round × ROUND_SCORE_MULT)`  
`timePct` = fraction of time remaining when the player answers (0–1).

## Timing

| Constant             | Default | Effect |
|----------------------|---------|--------|
| `NEXT_ROUND_DELAY_MS`| 500     | Pause after a correct answer before next round |
| `GAME_OVER_DELAY_MS` | 500     | Pause after wrong/timeout before game-over screen |

## Visual Feedback

| Constant                  | Default   | Effect |
|---------------------------|-----------|--------|
| `CORRECT_BTN_BG`          | `#1A22c55e` | Correct button background tint |
| `CORRECT_BTN_BORDER`      | `#22c55e` | Correct button border |
| `CORRECT_OVERLAY`         | `#22c55e` | Zone flash color on correct |
| `WRONG_BTN_BG`            | `#1Aef4444` | Wrong button background tint |
| `WRONG_BTN_BORDER`        | `#ef4444` | Wrong button border |
| `WRONG_OVERLAY`           | `#ef4444` | Zone flash color on wrong |
| `OVERLAY_TARGET_OPACITY`  | 0.3       | Flash intensity (0–1) |
| `OVERLAY_DURATION_SEC`    | 0.25      | Flash duration |
| `WRONG_FADE_DURATION_SEC` | 0.2       | Time to dim non-matching shapes |
| `WRONG_FADE_TARGET`       | 0.15      | Opacity target for dimmed shapes |
| `WRONG_PULSE_DURATION_SEC`| 1.0       | Duration of scale pulse on matching shape |
| `WRONG_PULSE_PEAK`        | 1.4       | Peak scale multiplier during pulse |

## Shape Layout

| Constant        | Default | Effect |
|-----------------|---------|--------|
| `SHAPE_SIZE_MIN`| 0.25    | Smallest shape as fraction of grid cell width |
| `SHAPE_SIZE_MAX`| 0.65    | Largest shape as fraction of grid cell width |
| `SHAPE_JITTER`  | 0.65    | Max random offset per shape (in cell-width units) |
| `ZONE_SIZE`     | 450     | Canvas pixel dimension — must match XAML zone size |

## Debug Flags

These must both be in their default state before publishing:

```typescript
export const DEBUG_COLOR_FILTER: string[] = [];   // [] = all colors active
export const DEBUG_EDGE_TEST = false;              // true = corner/edge placement test
```

`DEBUG_COLOR_FILTER` accepts a subset of `ColorKey` values to restrict generated rounds for quick visual testing (e.g., `['red', 'blue']`).
