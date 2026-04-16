---
name: shot-feedback
summary: How to add or modify shot outcome feedback — UI animations, VFX, camera shake, and sound
include: always
---

# Shot Feedback System

## Overview

When a shot is resolved, `GameManager` fires `ShotFeedbackResultEvent`. Multiple systems subscribe to this event to deliver layered feedback:

1. **UI text animation** (ShotFeedbackDisplayComponent)
2. **Camera shake** (CameraShakeService)
3. **3D particle burst** (VfxService)
4. **UI confetti** (ConfettiExplosionUIComponent, goal only)
5. **Sound effects** (AudioManager)

## ShotFeedbackResultEvent Payload

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | number | ShotOutcome enum (0=Goal, 1=Save, 2=PostHit, 3=Miss) |
| `pointsEarned` | number | Points awarded for this shot |
| `bonusZone` | string | `'CORNER'`, `'CHIP'`, or `''` |

## How to Add a New Shot Outcome

1. **Add the enum value** in `Types.ts`:
   ```typescript
   export enum ShotOutcome {
     Goal = 0, Save = 1, PostHit = 2, Miss = 3, Nutmeg = 4,
   }
   ```

2. **Add detection logic** in `GameManager` or `BallService`

3. **Add feedback profile** in `ShotFeedbackDisplayComponent`:
   - Define animation params (overshoot, duration, color, text)
   - Add case to the outcome switch

4. **Add camera shake** in `CameraShakeService`:
   - Add constants in `Constants.ts` (intensity + duration)
   - Add case to the outcome switch

5. **Add VFX burst** in `VfxService`:
   - Add constants in `Constants.ts` (count, speed, life, scale, colors)
   - Add case to the outcome switch

6. **Add sound** in `AudioManager`:
   - Add SFX constant, create scene entity, add case to `onShotResult()`

## How to Modify Feedback Intensity

### Camera Shake
Constants in `Constants.ts`:
- `SHAKE_GOAL_INTENSITY` / `SHAKE_GOAL_DURATION` (0.25 / 0.5s)
- `SHAKE_SAVE_INTENSITY` / `SHAKE_SAVE_DURATION` (0.12 / 0.3s)
- `SHAKE_POST_INTENSITY` / `SHAKE_POST_DURATION` (0.10 / 0.25s)
- `SHAKE_MISS_INTENSITY` / `SHAKE_MISS_DURATION` (0.05 / 0.15s)

### VFX Particles
Constants in `Constants.ts` per outcome: `VFX_{OUTCOME}_COUNT`, `_SPEED_MIN/MAX`, `_LIFE`, `_SCALE`

### UI Animation Profiles
Defined inside `ShotFeedbackDisplayComponent` as `IAnimProfile` objects. Key params:
- `overshoot` — scale bounce amplitude
- `duration` — total animation time
- `text` / `color` — display text and color

## How to Add a New Feedback Layer

1. Create a new service or component
2. Subscribe to `ShotFeedbackResultEvent`
3. Switch on `p.outcome` to determine behavior
4. If you need timing constants, add them to `Constants.ts`

## Related Files
- `Scripts/Events/ShotFeedbackEvents.ts` — event definition
- `Scripts/Components/ShotFeedbackDisplayComponent.ts` — UI animation
- `Scripts/Services/CameraShakeService.ts` — camera shake
- `Scripts/Services/VfxService.ts` — 3D particle effects
- `Scripts/Components/ConfettiExplosionUIComponent.ts` — UI confetti
- `Scripts/Services/AudioManager.ts` — sound effects
- `Scripts/Constants.ts` — all tuning values
