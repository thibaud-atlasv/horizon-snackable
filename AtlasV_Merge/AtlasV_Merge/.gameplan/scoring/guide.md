# Scoring Guide

## Purpose

The scoring system measures and rewards the player's performance. It translates merge events into points, tracks personal bests, and provides visual feedback that makes every merge feel valuable.

## Design Intent

Scoring should make chains feel exponentially rewarding. Higher tiers award more points, so building chains is always more valuable than many small merges. The score animation (count-up, pulse, floating tags) is critical juice that makes merges feel impactful.

## Module Keywords

points, score, best-score, combo, chain, animation, feedback, reward

## Behaviors

- Points awarded on each merge based on the resulting tier's score value
- Score display counts up smoothly rather than snapping
- Score text pulses on merge (scale animation)
- Floating "+N" tags drift upward from merge point
- Best score tracked across runs within a session

## UI Rules

- Layout: browse_focused
- Appearance: no
- Items: Point Values, Score Animation, Best Score Tracking

## Gameplan Image Generation

Scoring concept art — floating numbers, score counters with pulse effects, chain reaction visualizations. Warm gold/amber tones on dark background.

## Style & Art Direction

Score-related browse items use stylized number/counter imagery. Gold and amber tones represent value. Clean, readable, game-UI inspired.

## Content Rules

- Point values per tier clearly listed
- Animation parameters with timing values
- Progression curve description

## Source Files

- data/MergeLadder.ts — TIER_DEFS[].score (points per tier: 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66)
- scripts/Constants.ts — SCORE_COUNT_UP_SPEED, SCORE_PULSE_SCALE, SCORE_PULSE_DECAY, FLOAT_TAG_DURATION, FLOAT_TAG_SPEED
- scripts/GameComponent.ts — score tracking, displayedScore animation, scorePulse, floatingTags, bestScore

## Quick Tune Properties

### Score Pulse Scale
- Type: number (multiplier)
- Source: scripts/Constants.ts → SCORE_PULSE_SCALE
- Action: prompt
- Keywords: juice, impact, merge feel
- UI Type: slider
- UI Group: Animation

### Float Tag Duration
- Type: number (seconds)
- Source: scripts/Constants.ts → FLOAT_TAG_DURATION
- Action: prompt
- Keywords: popup, feedback, visibility
- UI Type: slider
- UI Group: Animation

### Score Count-Up Speed
- Type: number (seconds)
- Source: scripts/Constants.ts → SCORE_COUNT_UP_SPEED
- Action: prompt
- Keywords: smoothing, ramp, anticipation
- UI Type: slider
- UI Group: Animation

## Category Tune Properties

### Score Curve
- Keywords: progression, reward scaling
- Affects: how quickly points grow per tier
- Suggested presets: Linear, Quadratic, Exponential
- UI Type: toggle_multisegment
- UI Group: Customize
- Notes: Exponential = late tiers much more rewarding, incentivizes chain building

### Feedback Intensity
- Keywords: juice, animation, visual impact
- Affects: pulse scale, tag duration, count-up speed together
- Suggested presets: Subtle, Normal, Maximum
- UI Type: toggle_multisegment
- UI Group: Customize
- Notes: Maximum = bigger pulse, longer tags, slower count-up for drama
