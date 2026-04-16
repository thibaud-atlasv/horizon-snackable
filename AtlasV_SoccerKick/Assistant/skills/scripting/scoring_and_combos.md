---
name: scoring-and-combos
summary: How to extend or modify the scoring system, bonus zones, and combo mechanics
include: always
---

# Scoring & Combos

## Current System

Scoring is handled by `GameStateService.resolveShot(outcome, ballX, ballY)`.

### Base Points
- Goal: `PTS_GOAL` (100 points)
- Non-goals: 0 points

### Bonus Zones
| Zone | Condition | Multiplier | Constant |
|------|-----------|------------|----------|
| Corner | `\|ballX\| > GOAL_HALF_W * CORNER_THRESHOLD` | x1.8 | `PTS_CORNER_MULTI` |
| Chip | `ballY > GOAL_HEIGHT * HEIGHT_THRESHOLD` AND not corner | x1.5 | `PTS_CHIP_MULTI` |

### Combo System
- Consecutive goals increment combo counter
- Non-goal resets combo to 0
- Multiplier activates at `COMBO_THRESHOLD` (3) consecutive goals
- Multiplier = combo count, capped at `MAX_COMBO_MULTI` (6)
- Formula: `points = PTS_GOAL * bonusMulti * comboMulti`

## How to Add a New Bonus Zone

1. **Define the constant** in `Constants.ts`:
   ```typescript
   export const PTS_POWER_MULTI = 1.3;
   export const POWER_THRESHOLD = 0.90;
   ```

2. **Add detection** in `GameStateService.resolveShot()`:
   - Check the ball position or other conditions
   - Apply the multiplier before combo stacking
   - Set the `bonusZone` string on the ShotFeedbackResultPayload

3. **Update the feedback** — `ShotFeedbackDisplayComponent` reads `bonusZone` and shows the tag (e.g. "POWER") below the points

## How to Modify Combo Rules

All combo constants are in `Constants.ts`:
- `COMBO_THRESHOLD` — consecutive goals before multiplier activates
- `MAX_COMBO_MULTI` — maximum multiplier cap

The combo logic is in `GameStateService`:
- `notifyShotFired()` does not affect combo
- `resolveShot()` increments or resets combo based on outcome
- `broadcastScore()` sends the current combo in `ScoreChangedEvent`

## How to Add a New Scoring Event

If you want to award points for something other than a goal (e.g. a near-miss bonus):

1. Add the scoring logic in `GameStateService`
2. Fire `ScoreChangedEvent` after updating the score
3. The HUD and feedback systems react automatically to `ScoreChangedEvent`

## Related Files
- `Scripts/Constants.ts` — scoring constants
- `Scripts/Services/GameStateService.ts` — scoring logic
- `Scripts/Events/ShotFeedbackEvents.ts` — ShotFeedbackResultPayload (bonusZone field)
- `Scripts/Components/ShotFeedbackDisplayComponent.ts` — bonus zone display
