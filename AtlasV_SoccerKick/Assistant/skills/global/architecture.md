---
name: architecture
summary: Soccer Kick 3D game architecture — services, components, events, data flow
include: always
---

# Architecture

## Overview

Soccer Kick 3D is a penalty shootout game. The player swipes to kick a ball toward a goal defended by an AI goalkeeper. 6 shots per round, with combo and bonus multipliers.

## Game Loop

```
Aim → (swipe) → Flying → (physics tick + GK AI) → Result → (delay) → Aim
                                                          ↘ after 6 shots → GameOver → (tap) → reset
```

The `GameManager` component orchestrates the update loop each frame:
1. Tick GoalkeeperService (AI + idle sway)
2. Tick BallService (physics + collision detection)
3. Check GK collision (standing AABB or diving OBB)
4. Resolve outcome if ball reaches terminal state

## Services

| Service | File | Role |
|---------|------|------|
| `GameStateService` | `Services/GameStateService.ts` | Score, shots, combo, phase transitions |
| `BallService` | `Services/BallService.ts` | Ball physics: position, velocity, gravity, collisions |
| `GoalkeeperService` | `Services/GoalkeeperService.ts` | GK position, idle sway, reaction AI, dive logic |
| `CameraShakeService` | `Services/CameraShakeService.ts` | Decaying random-offset camera shake |
| `VfxService` | `Services/VfxService.ts` | 60-entity particle pool for burst effects |
| `BallTrailService` | `Services/BallTrailService.ts` | 24-entity trail dot pool |
| `AudioManager` | `Services/AudioManager.ts` | Event-driven sound routing |

## Components

| Component | Entity | Role |
|-----------|--------|------|
| `ClientSetup` | Scene | Camera init, swipe input, tap-to-restart |
| `GameManager` | Scene | Orchestrator: spawn, update loop, shot resolution |
| `BallController` | Ball (spawned) | Transform sync, idle animation, spin, shadow |
| `GoalkeeperController` | Keeper (spawned) | Transform sync, shadow |
| `ShotFeedbackDisplayComponent` | Game | Center-screen animated feedback + casino counter |
| `SoccerKickHudComponent` | SoccerKickHud | Score, shot dots, instruction text |
| `PowerGaugeComponent` | PowerGauge | Vertical power bar during aim |
| `GameOverStatsComponent` | GameOverStats | End-screen overlay with stats + replay |
| `ConfettiExplosionUIComponent` | ConfettiExplosion | Full-screen confetti on goals |
| `AudioSource` | Sound entities | Registers SoundComponent with AudioManager |

## Event Flow

All communication is event-driven via `EventService.sendLocally()`. No direct component references.

### Shot lifecycle:
1. `AimStartedEvent` — finger down (ClientSetup)
2. `AimUpdatedEvent` — finger drag with power (ClientSetup)
3. `PhaseChangedEvent` (Flying) — ball kicked (GameStateService)
4. `ShotFiredEvent` — shot consumed (GameStateService)
5. `ShotFeedbackResultEvent` — outcome resolved (GameManager)
6. `ScoreChangedEvent` — score updated (GameStateService)
7. `PointsReadyEvent` — casino roll-up done, HUD can animate (ShotFeedbackDisplay)
8. `PhaseChangedEvent` (Aim) — next shot ready

### Reset lifecycle:
1. `GameResetEvent` — round reset (GameStateService)
2. `KeeperDespawnEvent` — old keeper destroyed (GameManager)
3. New keeper spawned, ball repositioned

## Data Files

| File | Purpose |
|------|---------|
| `Types.ts` | Enums (GamePhase, ShotOutcome), interfaces (IGameSnapshot) |
| `Constants.ts` | All gameplay tuning values (physics, scoring, timing, VFX) |
| `Assets.ts` | All TemplateAsset references |
| `Defs/KeeperDefs.ts` | 3 goalkeeper definitions (IKeeperDef) |
| `Events/GameEvents.ts` | Game lifecycle events |
| `Events/ShotFeedbackEvents.ts` | Shot outcome event |

## Extension Points

- **New keeper type**: Add entry to `KEEPER_DEFS` array + template in Assets.ts
- **New scoring bonus**: Add multiplier constant in Constants.ts, logic in GameStateService.resolveShot()
- **New shot outcome**: Add enum value in Types.ts, handle in GameManager + ShotFeedbackDisplayComponent
- **New UI overlay**: Create XAML + Component, subscribe to events
- **New VFX**: Add burst config in VfxService, trigger from ShotFeedbackResultEvent
- **New sound**: Add SFX constant, create scene entity, subscribe in AudioManager
