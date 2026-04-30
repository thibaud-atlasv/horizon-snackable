# Overview Guide

## Purpose

The overview is the landing page for the Suika Merge Game gameplan. It provides project identity, navigation to all modules, and quick-tune sliders for the most impactful cross-cutting parameters.

## Design Intent

Give designers an at-a-glance understanding of what the game is and fast access to the most frequently adjusted parameters without navigating into individual modules.

## Module Keywords

overview, identity, navigation, quick-tune, project-level

## UI Rules

- Layout: overview
- Appearance: yes (3 visual theme variants for the whole game)
- Slots: header, title, tags, description, pillars, cards, appearance, quick_tune

## Gameplan Image Generation

- Header: Wide panoramic banner showing the game's jar/container with colorful fruits inside, gummy aesthetic, warm lighting
- Cards: Each card shows a representative image for its module — stylized and iconic

## Style & Art Direction

Warm, saturated, gummy aesthetic. Soft shadows, rounded shapes, dark calm backgrounds. All images should feel cohesive — same lighting direction, same rendering style.

## Content Rules

- Title: game name
- Tags: genre descriptors
- Description: 1-2 sentence summary
- Pillars: 4 identity tiles from project.md
- Cards: one per module with navigation

## Source Files

- Docs/PROJECT_SUMMARY.md — project pillars and identity
- Docs/ART_DIRECTION.md — visual direction

## Quick Tune Properties

### Gravity
- Type: number (px/s²)
- Source: scripts/Constants.ts → GRAVITY
- Action: prompt
- Keywords: physics, weight, fall speed
- UI Type: slider
- UI Group: Physics

### Drop Cooldown
- Type: number (seconds)
- Source: scripts/Constants.ts → DROP_COOLDOWN
- Action: prompt
- Keywords: pacing, rhythm, timing
- UI Type: slider
- UI Group: Gameplay

### Restitution
- Type: number (0-1)
- Source: scripts/Constants.ts → RESTITUTION
- Action: prompt
- Keywords: bounce, bounciness, physics
- UI Type: slider
- UI Group: Physics

### Game Over Delay
- Type: number (seconds)
- Source: scripts/Constants.ts → GAME_OVER_DELAY
- Action: prompt
- Keywords: danger, grace period, forgiveness
- UI Type: slider
- UI Group: Gameplay
