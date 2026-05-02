# Physics Guide

## Purpose

The physics system governs how fruits fall, bounce, settle, and collide inside the jar. It creates the emergent behavior that makes chain merges possible and gives the game its characteristic "alive" feeling.

## Design Intent

Physics should feel weighty but not sluggish, bouncy but not chaotic. Items should settle predictably enough for strategy but unpredictably enough for surprise chains. The balance between control and chaos defines the game's skill ceiling.

## Module Keywords

gravity, restitution, damping, collision, velocity, bounce, settle, weight

## Behaviors

- Gravity pulls all items downward continuously
- Circle-circle collision with elastic response and position correction
- Wall collisions (left, right, bottom) with restitution
- Exponential velocity damping simulates friction/air resistance
- Velocity clamping prevents physics explosions

## UI Rules

- Layout: browse_focused
- Appearance: no
- Items: Gravity, Collision Response, Damping, Velocity Limits

## Gameplan Image Generation

Abstract physics visualization — colorful circles with motion trails, bounce arrows, gravity indicators. Dark background, clean vector-style aesthetic matching the game's warm palette.

## Style & Art Direction

Physics browse items use abstract iconographic representations — not screenshots. Each shows the concept visually (falling arrow for gravity, bouncing circles for collision, fading trail for damping).

## Content Rules

- Each physics concept: current value, range, effect description
- Units clearly labeled (px/s², coefficient, factor)

## Source Files

- scripts/Constants.ts — GRAVITY, RESTITUTION, FRICTION_DAMPING, MAX_VELOCITY, POSITION_CORRECTION
- scripts/Physics.ts — physics step implementation (applyGravity, resolveCircleCollisions, applyDamping, resolveWallCollisions, clampVelocities)

## Quick Tune Properties

### Gravity
- Type: number (px/s²)
- Source: scripts/Constants.ts → GRAVITY
- Action: prompt
- Keywords: weight, fall speed, heaviness
- UI Type: slider
- UI Group: Core

### Restitution
- Type: number (0-1 coefficient)
- Source: scripts/Constants.ts → RESTITUTION
- Action: prompt
- Keywords: bounce, bounciness, elasticity
- UI Type: slider
- UI Group: Core

### Friction Damping
- Type: number (per second factor)
- Source: scripts/Constants.ts → FRICTION_DAMPING
- Action: prompt
- Keywords: friction, settling, air resistance
- UI Type: slider
- UI Group: Core

### Max Velocity
- Type: number (px/s)
- Source: scripts/Constants.ts → MAX_VELOCITY
- Action: prompt
- Keywords: speed cap, explosion prevention
- UI Type: slider
- UI Group: Limits

### Position Correction
- Type: number (0-1 factor)
- Source: scripts/Constants.ts → POSITION_CORRECTION
- Action: prompt
- Keywords: overlap, separation, stability
- UI Type: slider
- UI Group: Collision

## Category Tune Properties

### Physics Feel
- Keywords: weight, responsiveness, game feel
- Affects: overall physics character
- Suggested presets: Floaty, Balanced, Heavy
- UI Type: toggle_multisegment
- UI Group: Customize
- Notes: Floaty = low gravity + high restitution, Heavy = high gravity + low restitution

### Settling Speed
- Keywords: how fast items come to rest
- Affects: friction damping and position correction together
- Suggested presets: Slow, Normal, Quick
- UI Type: toggle_multisegment
- UI Group: Customize
- Notes: Quick settling = more predictable stacking, slow = more chaos
