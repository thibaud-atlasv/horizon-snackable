# Audio Manager

## Overview

Event-driven sound system. The `AudioManager` service listens to gameplay events and plays the appropriate sound effects through a pool of `SoundComponent` entities.

## Setup

1. Create a scene entity with a `SoundComponent` (audio asset assigned, `autoStart = false`)
2. Add an `AudioSource` component and set `soundId` to one of the SFX constants below
3. The `AudioManager` automatically triggers sounds from gameplay events

Multiple entities can share the same `soundId` for polyphony (round-robin playback).

## Sound IDs

### Kick & Ball
| ID | When | Volume |
|----|------|--------|
| `Kick` | Ball kicked (Flying phase entered) | 1.0 |
| `BallWhoosh` | Ball in flight | 1.0 |
| `BallHit` | Post/crossbar hit or save block | 1.0 |

### Shot Outcomes
| ID | When | Volume |
|----|------|--------|
| `sfx_goal` | Goal scored | 1.0 |
| `sfx_win` | Goal scored (layered celebration) | 1.0 |
| `sfx_lose` | Save, post hit, or miss | 1.0 |
| `GoalSave` | Goalkeeper save | 1.0 |
| `Miss` | Ball misses the frame | 1.0 |

### Combo Milestones
| ID | When | Volume |
|----|------|--------|
| `Combo2` | 2-goal streak | 0.2 |
| `Combo3` | 3-goal streak | 0.2 |
| `Combo5` | 5+ goal streak | 0.2 |

### Game State
| ID | When | Volume |
|----|------|--------|
| `sfx_game_start` | New round begins (GameResetEvent) | 1.0 |
| `sfx_game_over` | GameOver phase reached | 1.0 |
| `sfx_ui` | 1 second after GameOver (UI appear) | 1.0 |

## Event Routing

| Event | Sounds Played |
|-------|---------------|
| `ShotFeedbackResultEvent` (Goal) | `sfx_goal` + `sfx_win` |
| `ShotFeedbackResultEvent` (Save) | `BallHit` + `sfx_lose` |
| `ShotFeedbackResultEvent` (PostHit) | `BallHit` + `sfx_lose` |
| `ShotFeedbackResultEvent` (Miss) | `Miss` + `sfx_lose` |
| `ScoreChangedEvent` (combo >= 5) | `Combo5` |
| `ScoreChangedEvent` (combo >= 3) | `Combo3` |
| `ScoreChangedEvent` (combo >= 2) | `Combo2` |
| `PhaseChangedEvent` (Flying) | `Kick` |
| `PhaseChangedEvent` (GameOver) | `sfx_game_over` + `sfx_ui` (delayed 1s) |
| `GameResetEvent` | `sfx_game_start` |

## Adding New Sounds

1. Add a new constant to the `SFX` object in `AudioManager.ts`
2. Create a scene entity with `SoundComponent` + `AudioSource`, set `soundId` to the new constant
3. Subscribe to the relevant event in `AudioManager` and call `this._play(SFX.NEW_SOUND)`
