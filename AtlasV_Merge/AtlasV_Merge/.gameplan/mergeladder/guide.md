# Merge Ladder Guide

## Purpose

The merge ladder defines the 11-tier fruit progression that is the heart of the game. Each tier has a size, color, score value, and merge target. This module controls what the player is building toward and how rewarding each step feels.

## Design Intent

The ladder should feel like a satisfying journey from tiny to massive. Early tiers are common and quick to merge; later tiers are rare achievements that feel earned. The size progression must balance visual satisfaction with container space pressure.

## Module Keywords

tiers, fruits, progression, sizes, colors, merge-chain, spawn-weights

## Behaviors

- Two same-tier items collide → merge into next tier
- Tier 10 (Watermelon) is the final tier, cannot merge further
- Only tiers 0-4 can spawn directly via weighted random selection
- Larger tiers have larger collision radii, taking more container space

## UI Rules

- Layout: browse_focused
- Appearance: yes (fruit theme variants)
- Items: Cherry, Strawberry, Grape, Orange, Persimmon, Apple, Pear, Peach, Pineapple, Melon, Watermelon

## Gameplan Image Generation

Each fruit item should be rendered as a cute gummy/vinyl figure character with a kawaii face, matching its tier color, on a plain dark blurred background. Centered, consistent lighting from upper-left. Round shape with glossy highlight.

## Style & Art Direction

All fruits share the same rendering style: soft-shaded, slightly translucent edges, clean silhouettes, cute face with dot eyes and small mouth. Color must match the tier's hex color. Size increases progressively.

## Content Rules

- Each tier: name, color, radius, score, mergesInto, spawnWeight (if applicable)
- Spawnable tiers (0-4) show spawn weight percentage

## Source Files

- data/MergeLadder.ts — tier definitions (TIER_DEFS), spawn weights (SPAWN_WEIGHTS)
  - Tier properties: id, name, color, radius, mergesInto, score
  - Spawn weights: tier 0-4 with relative weights

## Quick Tune Properties

### Tier 0 Radius
- Type: number (pixels)
- Source: data/MergeLadder.ts → TIER_DEFS[0].radius
- Action: prompt
- Keywords: size, cherry, smallest
- UI Type: slider
- UI Group: Sizes

### Size Growth Factor
- Type: derived (ratio between adjacent tiers)
- Source: data/MergeLadder.ts → computed from radius values
- Action: prompt
- Keywords: growth, scaling, progression
- UI Type: slider
- UI Group: Sizes

## Category Tune Properties

### Tier Count
- Keywords: progression length, ladder depth
- Affects: total number of merge tiers
- Suggested presets: Short (7), Standard (11), Extended (15)
- UI Type: toggle_multisegment
- UI Group: Customize
- Notes: Changing tier count requires regenerating the full ladder

### Size Progression
- Keywords: growth curve, radius scaling
- Affects: how quickly items get larger per tier
- Suggested presets: Gentle, Standard, Aggressive
- UI Type: toggle_multisegment
- UI Group: Customize
- Notes: Aggressive growth fills container faster, increasing difficulty

### Spawn Pool
- Keywords: spawnable tiers, variety, difficulty
- Affects: which tiers can appear as the next drop
- Suggested presets: Narrow (0-3), Standard (0-4), Wide (0-5)
- UI Type: toggle_multisegment
- UI Group: Customize
- Notes: Wider pool increases early variety but reduces merge likelihood
