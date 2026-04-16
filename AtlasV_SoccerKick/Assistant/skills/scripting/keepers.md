---
name: keepers
summary: How to add, tune, or modify goalkeeper types and their AI behavior
include: always
---

# Goalkeeper System

## Overview

The goalkeeper system uses a def-based pattern. All keeper types are defined in `Defs/KeeperDefs.ts` as entries in the `KEEPER_DEFS` array. One is randomly selected per round by `GameManager`.

## Current Keeper Types

| # | Style | Reaction | Dive Chance | Hitbox Width | Key Trait |
|---|-------|----------|-------------|--------------|-----------|
| 1 | Aggressive diver | 120ms | 90% | 0.8m | Fast dive, narrow body |
| 2 | Big slow | 200ms | 75% | 1.25m | Wide hitbox, slow reaction |
| 3 | Quick stepper | 60ms | 65% | 0.75m | Instant reaction, high jump |

## IKeeperDef Fields

| Field | Type | Description |
|-------|------|-------------|
| `template` | TemplateAsset | 3D model reference from Assets.ts |
| `reactionMs` | number | Delay (ms) before GK reacts to kick |
| `diveChance` | number | Probability [0..1] of diving vs stepping |
| `speed` | number | Lateral speed when reacting |
| `idleSpeed` | number | Lateral speed during idle sway |
| `diveSpeed` | number | diveT increment per second |
| `diveLateral` | number | Total sideways distance at full dive |
| `diveHeight` | number | Peak vertical offset during dive |
| `halfW` | number | Half-width of standing hitbox |
| `standH` | number | Full height of standing hitbox |
| `footY` | number | Ignore contact below this Y |
| `animDiveOffsetY` | number | Visual Y offset for dive animation |
| `shadowBaseX` | number | Base X scale of shadow blob |

## How to Add a New Keeper

1. **Create the 3D model** — add a new template at `@Templates/Keepers/Goalkeeper4.hstf`

2. **Register the asset** in `Assets.ts`:
   ```typescript
   export const Keeper4 = new TemplateAsset('@Templates/Keepers/Goalkeeper4.hstf');
   ```

3. **Add the def** in `Defs/KeeperDefs.ts`:
   ```typescript
   {
     template:       Assets.Keeper4,
     reactionMs:     150,
     diveChance:     0.80,
     speed:          0.065,
     idleSpeed:      0.025,
     diveSpeed:      2.0,
     diveLateral:    1.8,
     diveHeight:     0.6,
     halfW:          1.0 / 2,
     standH:         1.80,
     footY:          0.10,
     animDiveOffsetY: 0.5,
     shadowBaseX:    1.3,
   },
   ```

No further code changes needed — `GameManager` picks randomly from the array.

## How to Tune an Existing Keeper

Edit the values directly in `Defs/KeeperDefs.ts`. Key tuning levers:

- **Difficulty**: Lower `reactionMs` and raise `diveChance` for harder keepers
- **Coverage**: Increase `halfW` (standing width) or `diveLateral` (dive reach)
- **Agility**: Increase `speed` and `diveSpeed`
- **Vertical threat**: Increase `diveHeight` for high-ball coverage

## AI Behavior (GoalkeeperService)

The GK AI flow during a shot:
1. **Idle sway** — sinusoidal lateral movement along goal line
2. **Reaction delay** — waits `reactionMs` after ball is kicked
3. **Direction prediction** — estimates where ball will cross goal plane
4. **Decision**: Dive (probability = `diveChance`) or step toward ball
5. **Dive execution**: Lateral + vertical movement over time, OBB collision check
6. **Standing block**: AABB collision check at current position

## Related Files
- `Scripts/Assets.ts` — keeper template references
- `Scripts/Defs/KeeperDefs.ts` — keeper definitions
- `Scripts/Services/GoalkeeperService.ts` — AI logic
- `Scripts/Components/GoalkeeperController.ts` — visual sync
