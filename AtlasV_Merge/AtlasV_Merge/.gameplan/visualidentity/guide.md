# Visual Identity Guide

## Purpose

Visual Identity defines how the game looks and feels — the color palette, container shape, background style, and UI aesthetic. It's the emotional wrapper around the mechanics that makes the game feel warm, inviting, and distinctive.

## Design Intent

The visual identity should be squishy, warm, and modern — like picking up a handful of soft candy. Items look touchable. The screen breathes. The palette is saturated but not garish, with items carrying the color load against a calm background.

## Module Keywords

palette, colors, container, background, UI, theme, style, aesthetic

## Behaviors

- Container defines the physical play boundaries (left, right, bottom walls)
- Background provides calm ambient context
- UI elements (score, next-up preview) overlay the game canvas
- Face parameters give items character (eyes, mouth positioning)

## UI Rules

- Layout: browse_focused
- Appearance: yes (3 whole-game visual theme variants)
- Items: Color Palette, Container Style, Background, Item Faces

## Gameplan Image Generation

Visual identity cards show the game's aesthetic — container with fruits inside for "Container Style", color swatches for "Palette", background gradients for "Background", cute face closeups for "Item Faces". All in the gummy/vinyl figure style.

## Style & Art Direction

Images for this module should showcase the art direction itself. Rich, warm, appetizing visuals. Gummy texture, soft lighting, saturated colors.

## Content Rules

- Container bounds in pixels
- Color values as hex strings
- Face parameter ratios
- Background style description

## Source Files

- scripts/Constants.ts — CONTAINER_LEFT, CONTAINER_RIGHT, CONTAINER_BOTTOM, CONTAINER_TOP, CONTAINER_WALL_THICKNESS, CONTAINER_WIDTH
- scripts/Constants.ts — FACE_EYE_OFFSET_X, FACE_EYE_OFFSET_Y, FACE_EYE_SIZE, FACE_MOUTH_Y
- scripts/Constants.ts — NEXT_PREVIEW_X, NEXT_PREVIEW_Y, NEXT_PREVIEW_SCALE
- Docs/ART_DIRECTION.md — full visual direction document
- data/MergeLadder.ts — TIER_DEFS[].color (tier color palette)

## Quick Tune Properties

### Container Width
- Type: derived (CONTAINER_RIGHT - CONTAINER_LEFT)
- Source: scripts/Constants.ts → CONTAINER_LEFT, CONTAINER_RIGHT
- Action: prompt
- Keywords: play area, space, difficulty
- UI Type: slider
- UI Group: Container

### Face Eye Size
- Type: number (fraction of radius)
- Source: scripts/Constants.ts → FACE_EYE_SIZE
- Action: prompt
- Keywords: character, cuteness, expression
- UI Type: slider
- UI Group: Faces

## Category Tune Properties

### Theme
- Keywords: visual style, reskin, aesthetic
- Affects: entire visual presentation
- Suggested presets: Fruits, Planets, Emojis
- UI Type: toggle_multisegment
- UI Group: Customize
- Notes: Changing theme requires regenerating all tier sprites

### Container Shape
- Keywords: jar, boundary, play area
- Affects: container visual and bounds
- Suggested presets: Jar, Bowl, Tank
- UI Type: toggle_multisegment
- UI Group: Customize
- Notes: Different shapes change the strategic feel of item placement
