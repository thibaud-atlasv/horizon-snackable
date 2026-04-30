# Gameplay Guide

## Purpose

Gameplay controls the session flow — how items are spawned, how quickly the player can drop, how the danger line works, and what triggers game over. These parameters define the game's pacing and difficulty curve.

## Design Intent

Pacing should feel rhythmic, not frantic. The drop cooldown creates a natural tempo. The danger line grace period ensures game-overs feel fair, not cheap. Spawn weights keep early game accessible while ensuring large items must be earned through merging.

## Module Keywords

drop, cooldown, spawn, danger-line, game-over, grace-period, pacing, timing

## Behaviors

- After dropping, a cooldown prevents the next item from appearing immediately
- Next item is randomly selected from tiers 0-4 using weighted probabilities
- Items above the danger line for longer than the grace period trigger game over
- Only settled items (low velocity) count toward danger detection
- Merge cooldown prevents newly created items from immediately re-merging

## UI Rules

- Layout: browse_focused
- Appearance: no
- Items: Drop Timing, Spawn Rules, Danger Detection, Session Flow

## Gameplan Image Generation

Gameplay concept imagery — drop arrows, timer icons, danger line warnings, spawn queues. Clean iconographic style on dark background with warm accent colors.

## Style & Art Direction

Abstract gameplay concept cards. Use icons and simplified game-state visualizations rather than literal screenshots.

## Content Rules

- Timing values in seconds
- Spawn weights as percentages
- Clear description of each rule's impact on difficulty

## Source Files

- scripts/Constants.ts — DROP_COOLDOWN, MERGE_COOLDOWN, GAME_OVER_DELAY, DROP_Y, DANGER_LINE_Y
- scripts/GameComponent.ts — dropItem(), checkGameOver(), updatePlaying(), drop cooldown logic, danger timer
- data/MergeLadder.ts — SPAWN_WEIGHTS, pickRandomTier()

## Quick Tune Properties

### Drop Cooldown
- Type: number (seconds)
- Source: scripts/Constants.ts → DROP_COOLDOWN
- Action: prompt
- Keywords: pacing, rhythm, speed
- UI Type: slider
- UI Group: Timing

### Game Over Delay
- Type: number (seconds)
- Source: scripts/Constants.ts → GAME_OVER_DELAY
- Action: prompt
- Keywords: grace period, forgiveness, difficulty
- UI Type: slider
- UI Group: Danger

### Merge Cooldown
- Type: number (seconds)
- Source: scripts/Constants.ts → MERGE_COOLDOWN
- Action: prompt
- Keywords: chain speed, cascade timing
- UI Type: slider
- UI Group: Timing

### Danger Line Y
- Type: number (pixels)
- Source: scripts/Constants.ts → DANGER_LINE_Y
- Action: prompt
- Keywords: difficulty, container height, breathing room
- UI Type: slider
- UI Group: Danger

## Category Tune Properties

### Difficulty
- Keywords: overall challenge, accessibility
- Affects: drop cooldown, game over delay, danger line position together
- Suggested presets: Easy, Normal, Hard, Brutal
- UI Type: toggle_multisegment
- UI Group: Customize
- Notes: Easy = long grace period + slow drops; Brutal = tight grace + fast drops

### Pacing
- Keywords: rhythm, tempo, session speed
- Affects: drop cooldown and merge cooldown
- Suggested presets: Relaxed, Standard, Frantic
- UI Type: toggle_multisegment
- UI Group: Customize
- Notes: Frantic reduces all cooldowns, creating faster but more chaotic play
